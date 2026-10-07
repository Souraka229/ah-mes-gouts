import {
  isKapsoSendConfigured,
  sendWhatsAppOutbound,
} from "./outbound-send";

export { isKapsoSendConfigured };

export async function sendKapsoWhatsAppText(
  to: string,
  body: string,
  phoneNumberIdOverride?: string,
): Promise<void> {
  await sendWhatsAppOutbound({
    toPhone: to,
    body,
    phoneNumberId: phoneNumberIdOverride,
    dedupe: true,
  });
}
