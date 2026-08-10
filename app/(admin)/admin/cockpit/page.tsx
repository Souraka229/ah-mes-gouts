import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type { AdminKpiPeriod } from "@/lib/admin/kpis";

const VALID_PERIODS: AdminKpiPeriod[] = ["today", "week", "month", "all"];

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AdminCockpitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = VALID_PERIODS.includes(params.period as AdminKpiPeriod)
    ? (params.period as AdminKpiPeriod)
    : "today";

  return <AdminDashboard period={period} />;
}
