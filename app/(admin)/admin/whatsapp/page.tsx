import { AdminWhatsAppPage } from "@/components/admin/admin-whatsapp-page";
import { getWhatsAppAdminPanelData } from "@/lib/server/whatsapp-admin";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppRoutePage() {
  const data = await getWhatsAppAdminPanelData(50);
  return (
    <AdminWhatsAppPage
      logs={data.logs}
      stats={data.stats}
      kapsoInboxUrl={data.kapsoInboxUrl}
      pendingWhatsappPayments={data.pendingWhatsappPayments}
      inboundQueuePending={data.inboundQueuePending}
      outboundQueuePending={data.outboundQueuePending}
      whatsappBotEnabled={data.whatsappBotEnabled}
      whatsappBotPausedMessage={data.whatsappBotPausedMessage}
    />
  );
}
