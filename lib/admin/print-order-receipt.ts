import { formatPrice } from "@/lib/format";
import {
  clientLabel,
  formatFulfillmentType,
  formatItemsSummary,
  formatScheduleLabel,
  getCakeMessage,
  paymentLabel,
} from "@/lib/admin/order-board";
import type { SavedOrder } from "@/types/order";

export function printOrderReceipt(order: SavedOrder): void {
  const cakeMessage = getCakeMessage(order);
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Reçu ${order.id}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; max-width: 400px; margin: 0 auto; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    .muted { color: #666; font-size: 0.875rem; }
    .row { margin: 8px 0; }
    .total { font-size: 1.25rem; font-weight: 700; margin-top: 16px; }
    hr { border: none; border-top: 1px dashed #ccc; margin: 16px 0; }
  </style>
</head>
<body>
  <h1>Commande ${order.id}</h1>
  <p class="muted">${new Date().toLocaleString("fr-FR")}</p>
  <hr />
  <div class="row"><strong>Client :</strong> ${clientLabel(order)}</div>
  <div class="row"><strong>Tél :</strong> ${order.client.phone}</div>
  <div class="row"><strong>Articles :</strong> ${formatItemsSummary(order)}</div>
  <div class="row"><strong>Type :</strong> ${formatFulfillmentType(order)}</div>
  <div class="row"><strong>Créneau :</strong> ${formatScheduleLabel(order)}</div>
  <div class="row"><strong>Paiement :</strong> ${paymentLabel(order)}</div>
  ${cakeMessage ? `<div class="row"><strong>Message :</strong> ${cakeMessage}</div>` : ""}
  <p class="total">Total : ${formatPrice(order.total)}</p>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=480,height=640");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
