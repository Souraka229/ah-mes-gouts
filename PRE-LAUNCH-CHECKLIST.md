# Checklist pré-lancement — Ah Mes Goûts

Utilisez ce fichier pour valider manuellement chaque point avant mise en production.
Cochez `[x]` au fur et à mesure.

---

## 1. Cohérence design system

- [ ] Aucune couleur hex hardcodée hors `app/globals.css` (grep `#` dans `.tsx`/`.ts`)
- [ ] Token `--color-photo-bg` / classe `bg-photo-bg` utilisé pour les fonds shooting produit
- [ ] Icônes UI : Lucide uniquement (pas d'emoji en interface)
- [ ] Polices : Cormorant Garamond (display) + Plus Jakarta Sans (body) partout
- [ ] Rayons cohérents : `rounded-2xl` cartes, `rounded-xl` éléments internes
- [ ] Composants shadcn restylés avec tokens marque (primary, accent, secondary)
- [ ] Ombres et espacements homogènes sur landing, catalogue, checkout

## 2. Responsive (4 breakpoints)

Tester sur **375px**, **768px**, **1024px**, **1440px** :

- [ ] Landing : hero scroll, carrousel produit, triptyque, footer géant
- [ ] Catalogue : grille 2/3 colonnes, filtres drawer mobile
- [ ] Fiche produit : galerie + panneau achat
- [ ] Drawer panier : scroll, totaux, CTA checkout
- [ ] Tunnel checkout 5 étapes : stepper lisible sur mobile
- [ ] Dashboard admin (quand branché) : navigation mobile utilisable
- [ ] Touch targets ≥ 44×44px sur tous les boutons/liens tactiles mobile

## 3. États manquants

### Loading
- [ ] Ajout au panier (fiche produit) — spinner + feedback
- [ ] Paiement / confirmation commande — bouton désactivé + loader
- [ ] Changement statut admin (quand API branchée)

### Empty states
- [ ] Panier vide — message marque + CTA catalogue
- [ ] Catalogue sans résultat — `EmptyState` avec ton Ah Mes Goûts
- [ ] Checkout panier vide — redirection visuelle catalogue
- [ ] Dashboard sans commande (quand admin branché)
- [ ] Stock faible admin (quand admin branché)

### Error states
- [ ] Paiement échoué — message + bouton Réessayer
- [ ] Perte connexion checkout — message réseau + Réessayer
- [ ] Stock insuffisant entre panier et paiement — détail par produit
- [ ] Rate limit API commande (429) — message utilisateur

### Succès
- [ ] Confirmation commande — animation spring + icône
- [ ] Confirmation cadeau — variante visuelle cadeau (icône Gift)

## 4. Données mockées → vraies données

- [ ] `lib/mock-data.ts` remplacé par fetch API NestJS `/products`
- [ ] Stock affiché = valeur DB temps réel (pas cache long)
- [ ] Commandes persistées en PostgreSQL (pas in-memory)
- [ ] `POST /api/orders` proxy vers NestJS ou remplacé
- [ ] Newsletter footer branchée (Mailchimp, Brevo, etc.)
- [ ] Variables d'environnement prod renseignées (voir `.env.example`)
- [ ] Aucune clé secrète dans le bundle client (`npm run build` + inspecter `.next`)

### Fichiers encore sur mock (mise à jour 10/08/2026)
- `lib/mock-data.ts` — catalogue, stock, filtres, sitemap (fallback si catalogue admin vide)
- `lib/order-storage.ts` — localStorage client (copie locale, la source de vérité reste Postgres)
- ~~`lib/server/order-repository.ts` en mémoire~~ → persiste en Postgres (Prisma) depuis la
  reconstruction plateforme
- ~~`mockProcessPayment`~~ → FeexPay actif en mode sandbox (`lib/payments/feexpay.ts`)

## 5. Sécurité

- [ ] Routes `/admin/*` protégées middleware serveur (JWT à brancher)
- [ ] API admin NestJS : vérification rôle sur chaque endpoint
- [ ] Suivi cadeau anonyme : `GET /api/orders/[id]/tracking` sans expéditeur si `sender_visible=false` (tester JSON brut)
- [ ] Rate limiting actif :
  - [x] Création commande `POST /api/orders` (5/min/IP)
  - [x] Suivi commande `GET /api/orders/[id]/tracking` (30/min/IP)
  - [ ] Codes promo (endpoint à créer)
  - [x] Paiement Mobile Money — `POST /api/payments/initiate` (10/min/IP) + webhook FeexPay (30/min/IP)
- [ ] Secrets uniquement en variables serveur (Cloudinary, MoMo, JWT)
- [ ] Headers sécurité prod (CSP, HSTS via hébergeur)

## 6. SEO

- [ ] Chaque page publique : `title` + `description` uniques
- [ ] `app/sitemap.ts` : une entrée par produit **en stock**
- [ ] `app/robots.ts` : exclut `/admin`, `/api`, `/checkout`, `/panier`, `/commande`, `/suivi`
- [ ] Images : `next/image` + alt pertinent partout
- [ ] JSON-LD : IceCreamShop, Product, Breadcrumb, FAQ
- [ ] Lighthouse accueil / catalogue / fiche produit ≥ 90 (Perf, A11y, BP, SEO)

## 7. Contenu réel vs placeholder

### À fournir par le porteur de projet
- [ ] URL Instagram réelle (`NEXT_PUBLIC_INSTAGRAM_URL`)
- [ ] Pages légales : Mentions légales, CGV, Confidentialité (liens actuellement `href="#"`)
- [ ] Texte footer CGV landing (`lib/landing-data.ts` → `footerNavLinks`)
- [ ] Photos produits manquantes ou approximatives :
  - `vanilla-caramel` → réutilise caramel-cappuccino (pas de photo dédiée)
  - `speculoos` → réutilise chocolat-cappuccino
  - `mousse-chocolat` → réutilise chocolat-menthe
  - `carte-cadeau` → réutilise goyave-vanille
- [ ] Numéro compte Mobile Money marchand
- [ ] Clés API prod (MoMo, Cloudinary, SMS)

### Vérifié en code
- [x] Pas de « Lorem ipsum » / « TODO » / « [à remplacer] » dans le code applicatif
- [x] Images landing → `/public/images/produits/` (photos réelles client)
- [x] Images catalogue → `/public/images/produits/` (mapping `lib/product-images.ts`)
- [ ] Dossier `public/images/generated/` — images IA initiales, non utilisées (peut être supprimé)

## 8. Performance

- [ ] Toutes les images via `next/image` (pas de `<img>` brut)
- [ ] Formats AVIF/WebP (`next.config.ts`)
- [ ] `sizes` adaptés sur cartes produit et galerie
- [ ] Pas de re-render inutile (deps `useEffect`/`useMemo` vérifiées)
- [ ] Bundle raisonnable — pas d'import complet de librairie lourde
- [ ] Framer Motion : imports ciblés (pas `import { motion } from "framer-motion"` problématique — OK)

---

## Tests manuels rapides avant go-live

1. [ ] Parcours complet : catalogue → panier → checkout livraison → paiement → confirmation
2. [ ] Parcours cadeau anonyme : toggle cadeau → suivi sans nom expéditeur
3. [ ] Produit épuisé non commandable
4. [ ] Filtres catalogue + recherche
5. [ ] `/admin` redirige sans token preview
6. [ ] `sitemap.xml` et `robots.txt` accessibles

---

## Commandes utiles

```bash
npm run build
npm run start
# Lighthouse (Chrome DevTools) sur http://localhost:3000
```

---

*Dernière mise à jour audit : 30 juin 2026*
