import { normalizeBeninPhone } from "@/lib/crm/phone";
import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { createCheckoutOrder } from "@/lib/server/create-checkout-order";
import { getServerOrder } from "@/lib/server/order-repository";
import { getAvailableSlots } from "@/lib/server/slot-bookings";
import { attachVariants, getFullCatalog } from "@/lib/server/shop-catalog";
import { validateCartStockWithCatalog } from "@/lib/validate-cart-stock";
import type { PaymentMethod, ReceptionMode } from "@/types/order";

import {
  deliveryFeeForLocality,
  resolveLocalityFromUserText,
} from "./delivery-locality";
import { getWhatsAppCustomerContext } from "./customer-context";
import { formatFcfaShort, joinBlocks } from "./message-compose";
import {
  getMenuSnapshotForBot,
  type MenuSnapshot,
} from "./menu-snapshot";
import {
  clearOrderDraft,
  getOrderDraft,
  saveOrderDraft,
  type CartLine,
  type OrderDraftData,
} from "./order-draft";
import { savePaySession, getPaySession } from "./pay-session";
import type { OutboundWhatsAppReply } from "./process-message";
import { isExplicitWhatsAppOrderTrigger } from "./replies";
import {
  catalogUrl,
  deliveryZonesUrl,
  productUrl,
  trackingUrl,
} from "./site-links";

const SLOTS_PER_PAGE = 6;

function reply(text: string, intent: OutboundWhatsAppReply["intent"] = "order_on_site"): OutboundWhatsAppReply {
  return {
    text,
    deterministic: true,
    intent,
    tier: "assiste",
  };
}

function isCancel(text: string): boolean {
  const t = text.toLowerCase().trim();
  return /^(annuler|annule|stop|cancel)\b/.test(t);
}

function formatMenuList(snapshot: MenuSnapshot): string {
  const lines = snapshot.lines.filter((l) => !l.soldOut).slice(0, 12);
  if (lines.length === 0) {
    return "Menu indisponible pour le moment.";
  }
  return lines
    .map((l, i) => {
      const tag = l.siteOnly ? " · site" : "";
      return `${i + 1}. ${l.name} — ${formatFcfaShort(l.priceFcfa)}${tag}`;
    })
    .join("\n");
}

function lineByIndex(snapshot: MenuSnapshot, index: number) {
  return snapshot.lines.filter((l) => !l.soldOut).slice(0, 12)[index];
}

function parseAddLine(
  text: string,
  snapshot: MenuSnapshot,
): { line: CartLine; siteOnly: boolean } | null {
  const m = text.trim().match(/^(\d{1,2})(?:\s*[x×]\s*(\d{1,2})|\s+(\d{1,2}))?$/i);
  if (!m) return null;
  const index = Number(m[1]) - 1;
  const qty = Number(m[2] ?? m[3] ?? 1);
  const p = lineByIndex(snapshot, index);
  if (!p || qty < 1 || qty > 20) return null;
  return {
    line: { slug: p.slug, name: p.name, quantity: qty },
    siteOnly: p.siteOnly,
  };
}

function mergeCart(cart: CartLine[], line: CartLine): CartLine[] {
  const next = [...cart];
  const i = next.findIndex((c) => c.slug === line.slug);
  if (i >= 0) {
    next[i] = { ...next[i], quantity: next[i].quantity + line.quantity };
  } else {
    next.push(line);
  }
  return next;
}

function formatCart(cart: CartLine[]): string {
  if (cart.length === 0) return "Panier vide.";
  return cart.map((c) => `• ${c.name} × ${c.quantity}`).join("\n");
}

function parseModeChoice(text: string): ReceptionMode | null {
  const t = text.toLowerCase().trim();
  if (/^(1|livraison|delivery)\b/.test(t)) return "delivery";
  if (/^(2|retrait|pickup|boutique)\b/.test(t)) return "pickup";
  if (/^(3|sur place|dinein|degustation)\b/.test(t)) return "dinein";
  return null;
}

function scheduleTypeForMode(mode: ReceptionMode): "delivery" | "pickup" {
  return mode === "delivery" ? "delivery" : "pickup";
}

function formatSlotList(
  slots: Awaited<ReturnType<typeof getAvailableSlots>>,
  page: number,
): string {
  const start = page * SLOTS_PER_PAGE;
  const slice = slots.slice(start, start + SLOTS_PER_PAGE);
  if (slice.length === 0) {
    return "Aucun créneau sur cette page.";
  }
  return slice
    .map((s, i) => {
      const label = new Date(s.start).toLocaleString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${i + 1}. ${label}`;
    })
    .join("\n");
}

function pickSlot(
  slots: Awaited<ReturnType<typeof getAvailableSlots>>,
  page: number,
  choice: number,
) {
  const index = page * SLOTS_PER_PAGE + (choice - 1);
  return slots[index] ?? null;
}

export async function tryWhatsAppOrderFlow(input: {
  fromPhone: string;
  text: string;
}): Promise<OutboundWhatsAppReply | null> {
  const paySession = await getPaySession(input.fromPhone);
  if (paySession && paySession.state !== "idle") {
    return null;
  }

  const draft = await getOrderDraft(input.fromPhone);
  const text = input.text.trim();

  if (draft || isExplicitWhatsAppOrderTrigger(text)) {
    if (isCancel(text)) {
      await clearOrderDraft(input.fromPhone);
      return reply("Commande annulée. Écrivez « commander » pour recommencer.");
    }
  }

  if (!draft && !isExplicitWhatsAppOrderTrigger(text)) {
    return null;
  }

  const snapshot = await getMenuSnapshotForBot();

  if (!draft) {
    await saveOrderDraft(input.fromPhone, { state: "menu", cart: [] });
    return reply(
      "Commande WhatsApp — menu du jour :\n\n" +
        `${formatMenuList(snapshot)}\n\n` +
        `Catalogue complet : ${catalogUrl()}\n\n` +
        "Répondez avec le numéro (ex. 1 ou 2x2).\n" +
        "« panier » · « valider » · « annuler »",
    );
  }

  if (draft.state === "menu") {
    const lower = text.toLowerCase();
    if (lower === "panier" || lower === "cart") {
      return reply(`Votre panier :\n${formatCart(draft.cart)}`);
    }
    if (lower === "valider" || lower === "continuer") {
      if (draft.cart.length === 0) {
        return reply("Ajoutez au moins un produit (numéro du menu).");
      }
      await saveOrderDraft(input.fromPhone, { ...draft, state: "choose_mode" });
      return reply(
        `Récap :\n${formatCart(draft.cart)}\n\n` +
          "Mode :\n1 Livraison\n2 Retrait boutique\n3 Sur place\n\n" +
          "Répondez 1, 2 ou 3.",
      );
    }
    const parsed = parseAddLine(text, snapshot);
    if (!parsed) {
      return reply(
        "Numéro invalide. Ex. 1 ou 3x2.\n« panier » · « valider » · « annuler »",
      );
    }
    if (parsed.siteOnly) {
      return reply(
        `« ${parsed.line.name} » se personnalise sur le site :\n${productUrl(parsed.line.slug)}\n\n` +
          "Choisissez un autre numéro du menu du jour, ou « valider » si le panier vous convient.",
      );
    }
    const cart = mergeCart(draft.cart, parsed.line);
    await saveOrderDraft(input.fromPhone, { ...draft, cart });
    return reply(`Ajouté : ${parsed.line.name} × ${parsed.line.quantity}.\n« valider » quand c’est bon.`);
  }

  if (draft.state === "choose_mode") {
    const mode = parseModeChoice(text);
    if (!mode) {
      return reply("Répondez 1 (livraison), 2 (retrait) ou 3 (sur place).");
    }
    const next: OrderDraftData = {
      ...draft,
      mode,
      state: mode === "delivery" ? "delivery_locality" : "choose_slot",
      slotPage: 0,
    };
    if (mode === "delivery") {
      const ctx = await getWhatsAppCustomerContext(input.fromPhone);
      const last = ctx.lastPaidOrder;
      if (last?.mode === "delivery" && last.zoneName) {
        const resolved = resolveLocalityFromUserText(last.zoneName);
        if (resolved) {
          const fee = await deliveryFeeForLocality(
            resolved.zoneId,
            resolved.area,
          );
          if (fee !== undefined) {
            const updated: OrderDraftData = {
              ...next,
              mode: "delivery",
              deliveryZoneId: resolved.zoneId,
              deliveryLocality: resolved.area,
              state: "choose_slot",
              slotPage: 0,
            };
            await saveOrderDraft(input.fromPhone, updated);
            return reply(
              joinBlocks([
                `Livraison : ${resolved.area} (${formatFcfaShort(fee)}) — comme la dernière fois.`,
                "Autre quartier ? Retapez le nom.",
                await slotPageMessage(updated),
              ]),
            );
          }
        }
      }
      await saveOrderDraft(input.fromPhone, next);
      return reply(
        joinBlocks([
          "Quartier (ex. Vodjè, Haie Vive) :",
          `Grille : ${deliveryZonesUrl()}`,
        ]),
      );
    }
    await saveOrderDraft(input.fromPhone, next);
    return showSlotPage(input.fromPhone, next);
  }

  if (draft.state === "delivery_locality") {
    const resolved = resolveLocalityFromUserText(text);
    if (!resolved) {
      return reply(
        "Quartier non reconnu. Retapez le nom (ex. « Haie Vive »).\n" +
          `Grille : ${deliveryZonesUrl()}\n` +
          `Sinon : ${catalogUrl()} puis checkout livraison.`,
      );
    }
    const fee = await deliveryFeeForLocality(resolved.zoneId, resolved.area);
    if (fee === undefined) {
      return reply(
        "Ce quartier n’est plus desservi. Essayez un autre nom ou passez par le site.",
      );
    }
    const updated: OrderDraftData = {
      ...draft,
      mode: "delivery",
      deliveryZoneId: resolved.zoneId,
      deliveryLocality: resolved.area,
      state: "choose_slot",
      slotPage: 0,
    };
    await saveOrderDraft(input.fromPhone, updated);
    return reply(
      `Livraison : ${resolved.area} · ${fee.toLocaleString("fr-FR")} FCFA\n\n` +
        (await slotPageMessage(updated)),
    );
  }

  if (draft.state === "choose_slot") {
    const lower = text.toLowerCase();
    if (lower === "plus" || lower === "suivant") {
      const page = (draft.slotPage ?? 0) + 1;
      await saveOrderDraft(input.fromPhone, { ...draft, slotPage: page });
      return showSlotPage(input.fromPhone, { ...draft, slotPage: page });
    }
    const n = Number(text.trim());
    if (!Number.isInteger(n) || n < 1) {
      return reply("Choisissez le numéro du créneau, ou « plus » pour la page suivante.");
    }
    const mode = draft.mode ?? "pickup";
    const slots = await getAvailableSlots(scheduleTypeForMode(mode));
    const slot = pickSlot(slots, draft.slotPage ?? 0, n);
    if (!slot) {
      return reply("Créneau invalide. Retapez le numéro ou « plus ».");
    }
    const ctx = await getWhatsAppCustomerContext(input.fromPhone);
    const withSlot: OrderDraftData = {
      ...draft,
      slotStart: slot.start,
      slotEnd: slot.end,
      firstName:
        ctx.firstName && ctx.firstName.length >= 2
          ? ctx.firstName
          : draft.firstName,
      lastName:
        draft.lastName ??
        (ctx.lastName && ctx.lastName.length >= 2 ? ctx.lastName : undefined),
    };
    if (mode === "delivery") {
      const last = ctx.lastPaidOrder;
      const canReuse =
        last?.mode === "delivery" && (last.address?.length ?? 0) >= 4;
      const nextDraft: OrderDraftData = {
        ...withSlot,
        state: withSlot.firstName ? "ask_address" : "ask_name",
        pendingAddressReuse: canReuse ? last!.address : undefined,
        pendingLandmarkReuse: canReuse ? last!.landmark : undefined,
      };
      await saveOrderDraft(input.fromPhone, nextDraft);
      if (withSlot.firstName) {
        if (canReuse) {
          return reply(
            joinBlocks([
              "Créneau retenu.",
              `Même adresse que la dernière fois ?\n${last!.address}`,
              "Répondez OUI ou tapez la nouvelle adresse.",
            ]),
          );
        }
        return reply("Créneau retenu.\nAdresse (rue, immeuble) :");
      }
      return reply("Créneau retenu.\nVotre prénom ?");
    }
    await saveOrderDraft(input.fromPhone, {
      ...withSlot,
      state: withSlot.firstName ? "confirm_create" : "ask_name",
    });
    if (withSlot.firstName) {
      return reply(buildConfirmCreateMessage(withSlot));
    }
    return reply("Votre prénom ? (2 lettres minimum)");
  }

  if (draft.state === "ask_name") {
    const name = text.trim();
    if (name.length < 2) {
      return reply("Prénom trop court. Ex. Marie");
    }
    const next: OrderDraftData = {
      ...draft,
      firstName: name,
      lastName: draft.lastName ?? "Client",
      state: draft.mode === "delivery" ? "ask_address" : "confirm_create",
    };
    await saveOrderDraft(input.fromPhone, next);
    if (next.state === "ask_address") {
      return reply(`Merci ${name}. Adresse de livraison (rue, immeuble) :`);
    }
    return reply(buildConfirmCreateMessage(next));
  }

  if (draft.state === "ask_address") {
    if (/^oui\b/i.test(text.trim()) && draft.pendingAddressReuse) {
      const next: OrderDraftData = {
        ...draft,
        address: draft.pendingAddressReuse,
        landmark: draft.pendingLandmarkReuse ?? "",
        pendingAddressReuse: undefined,
        pendingLandmarkReuse: undefined,
        state: "confirm_create",
      };
      await saveOrderDraft(input.fromPhone, next);
      return reply(buildConfirmCreateMessage(next));
    }
    const address = text.trim();
    if (address.length < 4) {
      return reply("Adresse trop courte. Ex. Rue 123, immeuble bleu");
    }
    await saveOrderDraft(input.fromPhone, {
      ...draft,
      address,
      state: "ask_landmark",
    });
    return reply(
      "Repère utile (optionnel) — ex. face à la pharmacie.\nRépondez « - » pour passer.",
    );
  }

  if (draft.state === "ask_landmark") {
    const landmark = text.trim() === "-" ? "" : text.trim();
    const next: OrderDraftData = {
      ...draft,
      landmark,
      state: "confirm_create",
    };
    await saveOrderDraft(input.fromPhone, next);
    return reply(buildConfirmCreateMessage(next));
  }

  if (draft.state === "confirm_create") {
    if (!/^oui\b/i.test(text.toLowerCase())) {
      return reply("Répondez OUI pour enregistrer, ou ANNULER.");
    }
    return finalizeWhatsAppOrder(input.fromPhone, draft);
  }

  return null;
}

async function slotPageMessage(draft: OrderDraftData): Promise<string> {
  const mode = draft.mode ?? "pickup";
  const slots = await getAvailableSlots(scheduleTypeForMode(mode));
  const page = draft.slotPage ?? 0;
  const list = formatSlotList(slots, page);
  const more = slots.length > (page + 1) * SLOTS_PER_PAGE ? "\n« plus » pour d’autres créneaux" : "";
  return `Créneaux :\n${list}\n\nRépondez avec le numéro.${more}`;
}

async function showSlotPage(
  phone: string,
  draft: OrderDraftData,
): Promise<OutboundWhatsAppReply> {
  const body = await slotPageMessage(draft);
  return reply(body);
}

function buildConfirmCreateMessage(draft: OrderDraftData): string {
  const mode = draft.mode ?? "pickup";
  const modeLabel =
    mode === "delivery"
      ? `Livraison · ${draft.deliveryLocality ?? "quartier"}`
      : mode === "dinein"
        ? "Sur place"
        : "Retrait boutique";
  const slot =
    draft.slotStart && draft.slotEnd
      ? new Date(draft.slotStart).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";
  const lines = [
    "Récap final :",
    formatCart(draft.cart),
    modeLabel,
    `Créneau : ${slot}`,
  ];
  if (mode === "delivery" && draft.address) {
    lines.push(`Adresse : ${draft.address}`);
    if (draft.landmark) lines.push(`Repère : ${draft.landmark}`);
  }
  lines.push("", "Répondez OUI pour enregistrer la commande (paiement juste après).");
  return lines.join("\n");
}

async function paymentPromptReply(
  chatPhone: string,
  orderId: string,
  total: number,
  trackingToken: string | null | undefined,
  fulfillmentLine: string | null,
): Promise<OutboundWhatsAppReply> {
  await savePaySession(chatPhone, {
    state: "choose_method",
    orderId,
    amount: total,
  });
  const track = trackingUrl(orderId, trackingToken);
  return reply(
    [
      `Commande ${orderId} · ${total.toLocaleString("fr-FR")} FCFA`,
      fulfillmentLine ?? "",
      "",
      `Suivi (après paiement) : ${track}`,
      "",
      "Paiement obligatoire avant préparation.",
      "1 MTN · 2 Moov · 3 Celtiis · 4 Carte",
      "",
      "Le back-office voit la commande après paiement confirmé.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

async function finalizeWhatsAppOrder(
  chatPhone: string,
  draft: OrderDraftData,
): Promise<OutboundWhatsAppReply> {
  const fresh = await getOrderDraft(chatPhone);
  if (fresh?.orderId) {
    const prior = await getServerOrder(fresh.orderId);
    if (prior) {
      await clearOrderDraft(chatPhone);
      const fulfillmentLine = formatFulfillmentSummary({
        mode: prior.mode,
        zoneName: prior.zoneName ?? null,
        scheduledSlotStart: prior.scheduledSlotStart,
        scheduledSlotEnd: prior.scheduledSlotEnd,
      });
      return paymentPromptReply(
        chatPhone,
        prior.id,
        prior.total,
        prior.trackingToken,
        fulfillmentLine,
      );
    }
  }

  const mode = draft.mode ?? "pickup";
  const slotStart = draft.slotStart;
  const slotEnd = draft.slotEnd;
  if (!slotStart || !slotEnd) {
    return reply("Créneau manquant. Écrivez « annuler » puis « commander ».");
  }

  const catalog = await attachVariants(await getFullCatalog());
  const stockIssues = validateCartStockWithCatalog(
    draft.cart.map((c) => ({ slug: c.slug, name: c.name, quantity: c.quantity })),
    catalog,
  );
  if (stockIssues.length > 0) {
    return reply(
      `Stock : ${stockIssues.map((i) => i.message).join(" · ")}\n\nAjustez le panier ou « annuler ».`,
    );
  }

  const phone = normalizeBeninPhone(chatPhone) ?? chatPhone;
  const paymentMethod: PaymentMethod = "mtn_momo";
  const landmark =
    draft.mode === "delivery"
      ? [draft.deliveryLocality, draft.landmark].filter(Boolean).join(" — ")
      : draft.landmark ?? "";

  const created = await createCheckoutOrder({
    mode,
    paymentMethod,
    scheduledSlotStart: slotStart,
    scheduledSlotEnd: slotEnd,
    deliveryZoneId: draft.deliveryZoneId ?? null,
    deliveryLocality: draft.deliveryLocality ?? null,
    client: {
      firstName: draft.firstName ?? "Cliente",
      lastName: draft.lastName ?? "WhatsApp",
      phone,
      address: draft.address ?? "",
      landmark,
      message: "Commande via WhatsApp",
    },
    items: draft.cart.map((c) => ({
      name: c.name,
      slug: c.slug,
      quantity: c.quantity,
      supplements: [],
      options: [],
    })),
    salesChannel: "whatsapp",
  });

  if (!created.ok) {
    const hint =
      created.code === "SLOT_FULL"
        ? "\nRetapez un autre créneau : « annuler » puis « commander »."
        : created.code === "PRICING"
          ? `\nProduit à personnaliser sur le site : ${catalogUrl()}`
          : "";
    return reply(`${created.error}${hint}`);
  }

  const order = created.order;
  await saveOrderDraft(chatPhone, {
    ...draft,
    orderId: order.id,
    state: "confirm_create",
  });
  await clearOrderDraft(chatPhone);

  const fulfillmentLine = formatFulfillmentSummary({
    mode: order.mode,
    zoneName: order.zoneName ?? null,
    scheduledSlotStart: order.scheduledSlotStart,
    scheduledSlotEnd: order.scheduledSlotEnd,
  });

  return paymentPromptReply(
    chatPhone,
    order.id,
    order.total,
    order.trackingToken,
    fulfillmentLine,
  );
}
