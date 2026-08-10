import { formatPrice } from "@/lib/format";
import {
  clientLabel,
  formatFulfillmentPlace,
  formatFulfillmentType,
  formatScheduleLabel,
  getCakeMessage,
  paymentLabel,
} from "@/lib/admin/order-board";
import { BOUTIQUE_LOCATION, ORDER_PHONE, SLOGAN } from "@/lib/business-info";
import { SITE_NAME, SITE_NAME_WITH_CREDIT, BUSINESS } from "@/lib/seo/site";
import type { SavedOrder } from "@/types/order";

/** Échappe le texte injecté dans le HTML (numéros, noms, messages). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Facture normalisée haut de gamme — mise en page A4, en-tête de marque,
 * tableau d'articles, totaux et pied de page. Ouvre une fenêtre d'impression.
 */
export function printOrderReceipt(order: SavedOrder): void {
  const cakeMessage = getCakeMessage(order);
  const isDelivery = (order.fulfillmentType ?? order.mode) === "delivery";

  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const invoiceDate = createdAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const invoiceTime = createdAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemsRows = order.items
    .map((item) => {
      const lineTotal = item.unitPrice * item.quantity;
      const supplements =
        item.supplements.length > 0
          ? `<div class="supp">+ ${escapeHtml(item.supplements.join(", "))}</div>`
          : "";
      return `<tr>
        <td class="desc"><span class="name">${escapeHtml(item.name)}</span>${supplements}</td>
        <td class="qty">${item.quantity}</td>
        <td class="price">${escapeHtml(formatPrice(item.unitPrice))}</td>
        <td class="price">${escapeHtml(formatPrice(lineTotal))}</td>
      </tr>`;
    })
    .join("");

  const deliveryRow =
    order.deliveryFee > 0
      ? `<tr>
          <td>Livraison — ${escapeHtml(order.zoneName ?? formatFulfillmentPlace(order))}</td>
          <td class="price">${escapeHtml(formatPrice(order.deliveryFee))}</td>
        </tr>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${escapeHtml(order.id)}</title>
  <style>
    :root {
      --primary: #17181b;
      --accent: #a6283a;
      --text: #221f1e;
      --muted: #6b6660;
      --border: #e4ddd6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: var(--text);
      background: #f5f2ef;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice {
      max-width: 780px;
      margin: 0 auto;
      background: #fff;
      padding: 48px 52px;
      box-shadow: 0 8px 40px rgba(23, 24, 27, 0.08);
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid var(--primary);
      padding-bottom: 24px;
    }
    .brand { font-size: 26px; font-weight: 800; color: var(--primary); letter-spacing: -0.02em; }
    .brand small { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); margin-top: 4px; }
    .coords { text-align: right; font-size: 12px; color: var(--muted); line-height: 1.6; }
    .doc-title { display: flex; justify-content: space-between; align-items: baseline; margin-top: 28px; }
    .doc-title h1 { font-size: 22px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.04em; }
    .doc-meta { text-align: right; font-size: 13px; color: var(--muted); line-height: 1.7; }
    .doc-meta strong { color: var(--text); }
    .parties { display: flex; gap: 32px; margin-top: 28px; }
    .party { flex: 1; }
    .party h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent); margin-bottom: 8px; }
    .party p { font-size: 13px; line-height: 1.7; color: var(--text); }
    .party .muted { color: var(--muted); }
    table { width: 100%; border-collapse: collapse; margin-top: 32px; }
    thead th {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--primary); text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--primary);
    }
    thead th.qty, thead th.price { text-align: right; }
    tbody td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: top; }
    tbody td.qty, tbody td.price { text-align: right; white-space: nowrap; }
    .desc .name { font-weight: 600; }
    .desc .supp { font-size: 11px; color: var(--muted); margin-top: 3px; }
    .totals { margin-top: 20px; margin-left: auto; width: 300px; }
    .totals table { margin: 0; }
    .totals td { padding: 8px 12px; border: none; font-size: 13px; }
    .totals td:last-child { text-align: right; white-space: nowrap; }
    .totals .grand td {
      border-top: 2px solid var(--primary); padding-top: 14px; margin-top: 8px;
      font-size: 18px; font-weight: 800; color: var(--primary);
    }
    .note { margin-top: 28px; padding: 14px 18px; background: #faf7f3; border-left: 3px solid var(--accent); font-size: 13px; line-height: 1.6; }
    .note strong { color: var(--primary); }
    .foot { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); text-align: center; }
    .foot .slogan { font-style: italic; color: var(--primary); font-size: 14px; }
    .foot .thanks { font-size: 12px; color: var(--muted); margin-top: 6px; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice { box-shadow: none; padding: 24px; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="head">
      <div class="brand">
        ${escapeHtml(SITE_NAME)}
        <small>${escapeHtml(SITE_NAME_WITH_CREDIT)}</small>
      </div>
      <div class="coords">
        ${escapeHtml(BOUTIQUE_LOCATION.full)}<br />
        ${escapeHtml(ORDER_PHONE.display)}<br />
        ${escapeHtml(BUSINESS.email)}
      </div>
    </div>

    <div class="doc-title">
      <h1>Facture</h1>
      <div class="doc-meta">
        N° <strong>${escapeHtml(order.id)}</strong><br />
        ${escapeHtml(invoiceDate)} · ${escapeHtml(invoiceTime)}
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h2>Client</h2>
        <p>
          <strong>${escapeHtml(clientLabel(order))}</strong><br />
          <span class="muted">${escapeHtml(order.client.phone)}</span>
        </p>
      </div>
      <div class="party">
        <h2>${isDelivery ? "Livraison" : "Retrait"}</h2>
        <p>
          ${escapeHtml(formatFulfillmentType(order))}<br />
          <span class="muted">${escapeHtml(formatFulfillmentPlace(order))}</span><br />
          <span class="muted">${escapeHtml(formatScheduleLabel(order))}</span>
        </p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="desc">Désignation</th>
          <th class="qty">Qté</th>
          <th class="price">P.U.</th>
          <th class="price">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td>Sous-total</td>
          <td>${escapeHtml(formatPrice(order.subtotal))}</td>
        </tr>
        ${deliveryRow}
        <tr class="grand">
          <td>Total</td>
          <td>${escapeHtml(formatPrice(order.total))}</td>
        </tr>
      </table>
    </div>

    <div class="note">
      <strong>Paiement :</strong> ${escapeHtml(paymentLabel(order))}
      ${cakeMessage ? `<br /><strong>Message :</strong> ${escapeHtml(cakeMessage)}` : ""}
    </div>

    <div class="foot">
      <p class="slogan">${escapeHtml(SLOGAN)}</p>
      <p class="thanks">Merci de votre confiance — ${escapeHtml(SITE_NAME_WITH_CREDIT)}</p>
    </div>
  </div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
