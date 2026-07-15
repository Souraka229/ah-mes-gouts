import { AdminCustomerDetailPage } from "@/components/admin/admin-customer-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientDetailAdminPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminCustomerDetailPage customerId={id} />;
}
