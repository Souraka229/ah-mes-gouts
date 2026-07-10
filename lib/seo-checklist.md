# Checklist SEO — Ah Mes Goûts

Document de vérification manuelle avant mise en production.
Dernière mise à jour : implémentation SEO technique Next.js App Router.

---

## 1. Métadonnées (`generateMetadata` / `metadata`)

| Page | Fichier | Title unique | Description | Canonical | OG image 1200×630 | Twitter Card | noindex |
|------|---------|:------------:|:-----------:|:---------:|:-------------------:|:------------:|:-------:|
| Accueil `/` | `app/(shop)/page.tsx` | ✅ | ✅ | ✅ | ✅ (hero glace) | ✅ | — |
| Catalogue `/catalogue` | `app/(shop)/catalogue/page.tsx` | ✅ | ✅ | ✅ `/catalogue` | ✅ | ✅ | ✅ si query filtres |
| Produit `/produit/[slug]` | `app/(shop)/produit/[slug]/page.tsx` | ✅ | ✅ | ✅ | ✅ (photo produit) | ✅ | — |
| Zones `/zones-de-livraison` | `app/(shop)/zones-de-livraison/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Checkout `/checkout` | `app/(shop)/checkout/page.tsx` | ✅ | ✅ | ✅ | — | — | ✅ |
| Confirmation `/commande/confirmation` | `app/(shop)/commande/confirmation/page.tsx` | ✅ | ✅ | ✅ | — | — | ✅ |
| Suivi `/suivi/[orderId]` | `app/(shop)/suivi/[orderId]/page.tsx` | ✅ | ✅ | ✅ | — | — | ✅ |

**À vérifier manuellement :**
- [ ] Définir `NEXT_PUBLIC_SITE_URL` en prod (`.env` / Vercel) → ex. `https://ahmesgouts.bj`
- [ ] Prévisualiser OG sur [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) et [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [ ] Titles ≤ 60 caractères avec suffixe `| Ah Mes Goûts` (template root layout)
- [ ] Descriptions 140–160 caractères, orientées conversion

**Note OG `product` :** le type Open Graph Facebook `product` est couvert via **JSON-LD Product** (recommandé Google). Next.js Metadata API ne expose pas `og:type=product` nativement.

---

## 2. Données structurées JSON-LD

| Schéma | Page(s) | Fichier source |
|--------|---------|----------------|
| `IceCreamShop` (+ LocalBusiness) | Accueil | `lib/seo/schemas.ts` |
| `Product` (prix XOF, InStock/OutOfStock dynamique) | Fiche produit | `lib/seo/schemas.ts` |
| `BreadcrumbList` | Catalogue, Produit, Zones | `lib/seo/schemas.ts` |
| `FAQPage` | Zones de livraison | `lib/seo/delivery-zone-content.ts` |
| `AggregateRating` / `Review` | — | ❌ **Non implémenté** (pas de faux avis) |

**À vérifier :**
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) sur `/`, `/produit/vanilla-caramel`, `/zones-de-livraison`
- [ ] Stock épuisé (ex. Tiramisu) → `OutOfStock` dans le schéma Product
- [ ] Produit en stock → `InStock`

---

## 3. Sitemap & Robots

| Fichier | Statut |
|---------|--------|
| `app/sitemap.ts` | ✅ Dynamique |
| `app/robots.ts` | ✅ Dynamique |

**Stratégie sitemap produits :**
- **Inclus** : produits en stock (`stockRemaining > 0`)
- **Exclus** : produits épuisés
- **Justification** : concentrer le crawl budget sur les pages convertibles ; les fiches épuisées restent accessibles (liens internes) mais ne sont pas poussées à l'indexation.

**`lastModified` :** basé sur `product.updatedAt` (mock → à brancher sur `updatedAt` Prisma en prod).

**Robots `disallow` :**
- `/admin/`, `/api/`, `/checkout`, `/commande/`, `/suivi/`

**À vérifier :**
- [ ] `https://[domaine]/sitemap.xml` accessible
- [ ] `https://[domaine]/robots.txt` référence le sitemap
- [ ] Soumettre sitemap dans Google Search Console

---

## 4. Performance (Core Web Vitals)

| Critère | Implémentation |
|---------|----------------|
| `next/image` partout | ✅ Hero, cards, galerie, panier, upsell |
| AVIF/WebP | ✅ `next.config.ts` formats + `f_auto` Cloudinary / Unsplash `auto=format` |
| `priority` above-the-fold | ✅ Hero + image principale fiche produit uniquement |
| Lazy load sous le fold | ✅ Cards catalogue, miniatures galerie |
| `aspect-ratio` / réservation espace | ✅ Cards `aspect-[4/5]`, galerie `aspect-[4/5]` |
| Fonts `next/font` | ✅ Cormorant + Plus Jakarta (`display: swap`) |

**Cibles :** LCP < 2,5 s · CLS < 0,1

**À vérifier :**
- [ ] Lighthouse / PageSpeed Insights (mobile) sur accueil + fiche produit
- [ ] Remplacer URLs Unsplash par Cloudinary en prod (`res.cloudinary.com` déjà autorisé)

---

## 5. Contenu & structure HTML

| Critère | Statut |
|---------|--------|
| Un seul `<h1>` par page | ✅ |
| Hiérarchie h1 → h2 → h3 | ✅ (sections, zones, FAQ) |
| URLs propres `/produit/[slug]` | ✅ |
| Alt text descriptifs | ✅ `lib/seo/images.ts` → `getProductAltText()` |
| Maillage interne | ✅ Produits similaires, liens catalogue/zones header & footer |
| Pas de meta keywords | ✅ |
| Pas de contenu caché SEO | ✅ |

---

## 6. Local SEO

| Élément | Statut |
|---------|--------|
| Page `/zones-de-livraison` | ✅ Contenu unique par zone |
| Quartiers ciblés | Cadjehoun, Fidjrossè, Akpakpa, Calavi, Haie Vive, etc. |
| Ville/zone dans titles & descriptions | ✅ |
| `IceCreamShop.areaServed` | ✅ Schéma accueil |
| NAP cohérent (nom, adresse, tél) | ✅ `lib/seo/site.ts` |

**À vérifier :**
- [ ] Créer / revendiquer fiche Google Business Profile
- [ ] Aligner téléphone + adresse avec le schéma

---

## 7. Indexation filtres catalogue

| Paramètre URL | noindex |
|---------------|:-------:|
| `?promotions=1` | ✅ |
| `?search=`, `?prix=`, `?disponible=`, etc. | ✅ (helper prêt) |

**Note :** les filtres catalogue sont encore en state client (sauf `promotions`). Si vous synchronisez les filtres dans l'URL plus tard, le helper `hasCatalogueFilterParams` couvre déjà les clés prévues.

---

## 8. Variables d'environnement

```env
NEXT_PUBLIC_SITE_URL=https://ahmesgouts.bj
```

Sans cette variable, le fallback est `https://ahmesgouts.bj` (voir `lib/seo/site.ts`).

---

## 9. Fichiers clés

```
lib/seo/site.ts              → Config business + URL
lib/seo/metadata.ts          → createPageMetadata()
lib/seo/schemas.ts           → JSON-LD builders
lib/seo/images.ts            → Optimisation images + alt text
lib/seo/delivery-zone-content.ts → Contenu local SEO + FAQ
components/seo/json-ld.tsx   → Injection JSON-LD
components/seo/breadcrumbs.tsx → Fil d'Ariane visible
app/sitemap.ts
app/robots.ts
```

---

## 10. Post-déploiement (Search Console)

- [ ] Vérifier couverture d'indexation (pas de pages checkout indexées)
- [ ] Surveiller requêtes : « glace livraison Cotonou », « glacier premium Bénin », « commander glace en ligne Cotonou »
- [ ] Corriger erreurs d'exploration éventuelles
- [ ] Demander indexation des pages zones + catalogue après lancement
