import { normalizeBeninPhone, formatPhoneDisplay } from "@/lib/crm/phone";
import { getPrisma } from "@/lib/prisma";
import { fromPrismaOrder } from "@/lib/server/order-mapper";
import type {
  AdminCustomerDetail,
  AdminCustomerListItem,
  CustomerSort,
} from "@/types/crm";

export type {
  AdminCustomerDetail,
  AdminCustomerListItem,
  CustomerSort,
} from "@/types/crm";

/**
 * Rattache les commandes historiques sans customerId.
 * Léger : max 300 commandes non liées par appel.
 */
export async function syncCustomersFromOrders(): Promise<number> {
  const prisma = getPrisma();
  const unbound = await prisma.order.findMany({
    where: { customerId: null },
    select: {
      id: true,
      clientPhone: true,
      clientFirstName: true,
      clientLastName: true,
      total: true,
      createdAt: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  if (unbound.length === 0) return 0;

  let linked = 0;
  const byPhone = new Map<
    string,
    {
      firstName: string;
      lastName: string;
      orders: typeof unbound;
    }
  >();

  for (const order of unbound) {
    const phone = normalizeBeninPhone(order.clientPhone);
    if (!phone) continue;
    const bucket = byPhone.get(phone) ?? {
      firstName: order.clientFirstName,
      lastName: order.clientLastName,
      orders: [],
    };
    if (!bucket.firstName) bucket.firstName = order.clientFirstName;
    if (!bucket.lastName) bucket.lastName = order.clientLastName;
    bucket.orders.push(order);
    byPhone.set(phone, bucket);
  }

  for (const [phone, bucket] of byPhone) {
    const active = bucket.orders.filter((o) => o.status !== "ANNULEE");
    const totalSpent = active.reduce((s, o) => s + o.total, 0);
    const dates = bucket.orders.map((o) => o.createdAt);
    const firstOrderAt = dates.reduce((a, b) => (a < b ? a : b));
    const lastOrderAt = dates.reduce((a, b) => (a > b ? a : b));

    const existing = await prisma.customer.findUnique({ where: { phone } });
    let customerId: string;

    if (existing) {
      customerId = existing.id;
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          firstName: bucket.firstName.trim() || existing.firstName,
          lastName: bucket.lastName.trim() || existing.lastName,
          firstOrderAt: existing.firstOrderAt ?? firstOrderAt,
          lastOrderAt:
            !existing.lastOrderAt || lastOrderAt > existing.lastOrderAt
              ? lastOrderAt
              : existing.lastOrderAt,
          ordersCount: { increment: bucket.orders.length },
          totalSpent: { increment: totalSpent },
        },
      });
    } else {
      const created = await prisma.customer.create({
        data: {
          phone,
          firstName: bucket.firstName.trim(),
          lastName: bucket.lastName.trim(),
          firstOrderAt,
          lastOrderAt,
          ordersCount: bucket.orders.length,
          totalSpent,
        },
      });
      customerId = created.id;
    }

    await prisma.order.updateMany({
      where: { id: { in: bucket.orders.map((o) => o.id) } },
      data: { customerId },
    });
    linked += bucket.orders.length;
  }

  return linked;
}

async function favoritesByCustomerIds(
  customerIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (customerIds.length === 0) return result;

  const prisma = getPrisma();
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        customerId: { in: customerIds },
        status: { not: "ANNULEE" },
      },
    },
    select: {
      name: true,
      quantity: true,
      order: { select: { customerId: true } },
    },
  });

  const counts = new Map<string, Map<string, number>>();
  for (const item of items) {
    const cid = item.order.customerId;
    if (!cid) continue;
    const bag = counts.get(cid) ?? new Map<string, number>();
    bag.set(item.name, (bag.get(item.name) ?? 0) + item.quantity);
    counts.set(cid, bag);
  }

  for (const [cid, bag] of counts) {
    result.set(
      cid,
      [...bag.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name),
    );
  }

  return result;
}

function displayName(firstName: string, lastName: string, phone: string): string {
  const full = `${firstName} ${lastName}`.trim();
  return full || formatPhoneDisplay(phone);
}

export async function listAdminCustomers(input: {
  q?: string;
  sort?: CustomerSort;
}): Promise<AdminCustomerListItem[]> {
  await syncCustomersFromOrders().catch((err) => {
    console.error("[crm] syncCustomersFromOrders:", err);
  });

  const prisma = getPrisma();
  const sort = input.sort ?? "lastOrderAt";
  const q = input.q?.trim();

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\D/g, "") } },
          ],
        }
      : undefined,
    orderBy:
      sort === "totalSpent"
        ? { totalSpent: "desc" }
        : sort === "ordersCount"
          ? { ordersCount: "desc" }
          : { lastOrderAt: "desc" },
    take: 200,
  });

  const favoritesMap = await favoritesByCustomerIds(customers.map((c) => c.id));

  return customers.map((c) => ({
    id: c.id,
    phone: c.phone,
    phoneDisplay: formatPhoneDisplay(c.phone),
    firstName: c.firstName,
    lastName: c.lastName,
    displayName: displayName(c.firstName, c.lastName, c.phone),
    ordersCount: c.ordersCount,
    totalSpent: c.totalSpent,
    firstOrderAt: c.firstOrderAt?.toISOString() ?? null,
    lastOrderAt: c.lastOrderAt?.toISOString() ?? null,
    favoriteProducts: favoritesMap.get(c.id) ?? [],
  }));
}

export async function getAdminCustomerDetail(
  customerId: string,
): Promise<AdminCustomerDetail | null> {
  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      _count: { select: { devices: true } },
      orders: {
        include: { items: true, driver: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 40,
      },
    },
  });

  if (!customer) return null;

  const favoritesMap = await favoritesByCustomerIds([customer.id]);
  const favoriteProducts = favoritesMap.get(customer.id) ?? [];

  return {
    id: customer.id,
    phone: customer.phone,
    phoneDisplay: formatPhoneDisplay(customer.phone),
    firstName: customer.firstName,
    lastName: customer.lastName,
    displayName: displayName(
      customer.firstName,
      customer.lastName,
      customer.phone,
    ),
    ordersCount: customer.ordersCount,
    totalSpent: customer.totalSpent,
    firstOrderAt: customer.firstOrderAt?.toISOString() ?? null,
    lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
    favoriteProducts,
    devicesCount: customer._count.devices,
    orders: customer.orders.map((row) => fromPrismaOrder(row)),
    recentActivity: customer.activities.map((a) => ({
      id: a.id,
      type: a.type,
      productName: a.productName,
      productSlug: a.productSlug,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
