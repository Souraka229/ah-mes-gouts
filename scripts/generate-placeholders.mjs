/** Génère une image placeholder SVG fond #FAF7F5 — exécuter : node scripts/generate-placeholders.mjs */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const BG = "#FAF7F5";
const ACCENT = "#C9A96E";
const SHAPE = "#D9CEC6";
const PLATE = "#EDE6E0";

function svg(label, emoji = "🍰") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="${BG}"/>
  <circle cx="400" cy="500" r="248" fill="${PLATE}" stroke="${ACCENT}" stroke-width="3" opacity="0.95"/>
  <ellipse cx="400" cy="490" rx="210" ry="168" fill="${SHAPE}"/>
  <ellipse cx="400" cy="430" rx="148" ry="108" fill="${ACCENT}" opacity="0.55"/>
  <ellipse cx="340" cy="410" rx="52" ry="36" fill="#F5EDE6" opacity="0.9"/>
  <text x="400" y="700" text-anchor="middle" font-family="Georgia,serif" font-size="72" fill="#5C3D4A">${emoji}</text>
  <text x="400" y="770" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" font-weight="600" fill="#5C3D4A">${label}</text>
</svg>`;
}

const catalog = [
  ["vanilla-caramel", "Vanilla Caramel", "🍮"],
  ["mango-passion", "Mango Passion", "🥭"],
  ["goyave-vanille", "Goyave Vanille", "🌸"],
  ["caramel-cappuccino", "Cappuccino", "☕"],
  ["caramel-baileys", "Baileys", "🥃"],
  ["tiramisu", "Tiramisu", "🍫"],
  ["foret-blanche", "Forêt Blanche", "🍒"],
  ["nutella-caramel", "Nutella", "🌰"],
  ["speculoos", "Speculoos", "🍪"],
  ["mousse-chocolat", "Mousse", "🍫"],
  ["carte-cadeau", "Carte cadeau", "💌"],
];

function svgGift(label, emoji, variant = "default") {
  const accentShape =
    variant === "bear"
      ? `<ellipse cx="400" cy="420" rx="120" ry="130" fill="${SHAPE}"/><circle cx="340" cy="360" r="45" fill="${SHAPE}"/><circle cx="460" cy="360" r="45" fill="${SHAPE}"/>`
      : variant === "bouquet"
        ? `<ellipse cx="400" cy="450" rx="100" ry="80" fill="#E8B4C8"/><ellipse cx="360" cy="420" rx="70" ry="60" fill="#F5D0E0"/><ellipse cx="440" cy="420" rx="70" ry="60" fill="#FFFFFF"/>`
        : `<rect x="300" y="380" width="200" height="140" rx="12" fill="${SHAPE}" stroke="${ACCENT}" stroke-width="2"/><circle cx="400" cy="450" r="28" fill="${ACCENT}" opacity="0.5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${BG}"/>
  <circle cx="400" cy="400" r="280" fill="${PLATE}" stroke="${ACCENT}" stroke-width="2" opacity="0.9"/>
  ${accentShape}
  <text x="400" y="620" text-anchor="middle" font-family="Georgia,serif" font-size="80" fill="#5C3D4A">${emoji}</text>
  <text x="400" y="700" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="600" fill="#5C3D4A">${label}</text>
</svg>`;
}

const upsell = [
  ["nounours-beige", "Nounours", "🧸", "bear"],
  ["bouquet-roses", "Bouquet", "💐", "bouquet"],
  ["carte-cadeau", "Carte cadeau", "💌", "card"],
];

const catalogDir = path.join(root, "public/images/catalog");
const upsellDir = path.join(root, "public/images/generated/upsell");

for (const dir of [catalogDir, upsellDir]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

for (const [slug, label, emoji] of catalog) {
  writeFileSync(path.join(catalogDir, `${slug}.svg`), svg(label, emoji));
}
for (const [slug, label, emoji, variant] of upsell) {
  writeFileSync(path.join(upsellDir, `${slug}.svg`), svgGift(label, emoji, variant));
}

console.log(`✓ ${catalog.length} images catalogue + ${upsell.length} upsell générées`);
