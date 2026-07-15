# Gift & ENTREMETS

**By [Ah Mes Goûts](https://ah-mes-gouts.vercel.app)** — desserts glacés premium à Cotonou.

Site e-commerce haut de gamme : catalogue → personnalisation → panier → boutique sur place → upsell → paiement Mobile Money / carte → suivi temps réel.

> Expérience type pâtisserie de luxe, pas un template Shopify. Objectif business : remplacer entièrement les commandes WhatsApp.

---

## Stack

| Couche | Techno |
|--------|--------|
| Front | Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Framer Motion |
| Back | NestJS-ready / API routes · Prisma · PostgreSQL (Supabase) |
| Médias | Cloudinary (prod) · WebP locaux (`public/images/produits/`) |
| Auth admin | JWT session cookie + liens magiques (`ADMIN_ACCESS_TOKENS`) |
| Paiements | MTN MoMo · Moov Money · Celtiis Cash · Visa/Mastercard |
| Deploy | Vercel (front) · Postgres managé |

## Design system

| Token | Hex | Usage |
|-------|-----|--------|
| Background | `#FAF7F5` | Crème |
| Primary | `#3B1F4D` | Violet profond |
| Secondary | `#F3C9CE` | Rose poudré |
| Accent / CTA | `#C9A96E` | Doré — actions clés uniquement |
| Text | `#241726` | Quasi-noir violacé |
| Success | `#6B8F71` | Vert sauge |

Typo : **Cormorant Garamond / Fraunces** (display) + **Plus Jakarta Sans / Inter** (UI). Icônes : Lucide uniquement.

## Admin — cockpit ops

Back-office pensé **ultra simple** et premium (`/admin`) :

- **KPIs du jour** : CA, commandes, panier moyen, part boutique / cadeaux (+ delta vs hier)
- **Pipeline** : Nouvelles → Préparation → Prêtes → En cours → Terminées
- **Accès rapides** : commandes, menu du jour, produits
- Rôles Administrateur / Employé, journal d’actions

Connexion : `/admin/entree?token=…` (tokens dans `ADMIN_ACCESS_TOKENS`).

## Parcours client

1. Catalogue & menu du jour  
2. Personnalisation  
3. Panier (drawer glass)  
4. **En boutique · Sur place**  
5. Upsell cadeaux (1 clic, skip facile)  
6. Paiement Mobile Money / carte  
7. Suivi de commande  

Infos métier (horaires 13h–19h, WhatsApp, règles) : `/infos` · `lib/business-info.ts`.

## Démarrage local

```bash
npm install
cp .env.example .env.local   # remplir DATABASE_URL, ADMIN_*, etc.
npx prisma migrate dev
npm run dev
```

- Boutique : [http://localhost:3000](http://localhost:3000)  
- Admin : [http://localhost:3000/admin](http://localhost:3000/admin)  

## Conventions clés

- Montants en **FCFA entiers** (jamais de float)  
- Stock diminué **après paiement validé** uniquement  
- Statuts commande stricts : Reçue → Paiement confirmé → Préparation → Prête → En livraison → Livrée  
- Client mémorisé en LocalStorage (compte non obligatoire)  
- Pas de clé API exposée côté client · validation Zod front + back  

## Structure utile

```
app/(shop)/          # boutique publique
app/(admin)/admin/   # back-office
components/shop/     # UI client
components/admin/    # cockpit + commandes + menus
lib/admin/kpis.ts    # KPIs dashboard
lib/business-info.ts # horaires, WhatsApp, règles
public/images/produits/  # photos catalogue WebP
```

## Site

- Prod Vercel : [https://gift-entremets.vercel.app](https://gift-entremets.vercel.app)
- Projet : `souraka017-8383s-projects/gift-entremets`
- Ancien projet (à ne plus utiliser) : `ah-mes-gouts`

```bash
npm run deploy:check
npm run deploy:env      # pousse env vers Vercel
npm run db:health
npx vercel deploy --prod
```

Marque commerciale **Gift & ENTREMETS** — crédit **Ah Mes Goûts**. Ne pas renommer.
