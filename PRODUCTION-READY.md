# Ah Mes Goûts — État production (review finale)

*Généré le 1er juillet 2026 — vérification MCP Supabase + audit code.*

---

## ⚠️ Alerte sécurité immédiate

**Un token d'accès Supabase a été exposé dans le chat.** Régénérez-le dès maintenant sur [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) et révoquez l'ancien. Ne le commitez jamais — utilisez `.cursor/mcp.json` (dans `.gitignore`) ou des variables d'environnement.

---

## 1. Vérification base de données (MCP Supabase)

### Projet cible confirmé — RESTAURANTGLASCE

| Champ | Valeur |
|-------|--------|
| **Project ref** | `ykzpdfwwjjdlhaulsaur` |
| **Région** | `eu-west-1` |
| **URL publique** | `https://ykzpdfwwjjdlhaulsaur.supabase.co` |
| **Host DB** | `db.ykzpdfwwjjdlhaulsaur.supabase.co` |
| **Postgres** | v17 |

Clés secrètes (`anon`, `service_role`, mot de passe DB, token MCP) :  
→ [Dashboard → Settings → API](https://supabase.com/dashboard/project/ykzpdfwwjjdlhaulsaur/settings/api)  
→ coller dans `.env.local` uniquement (jamais Git).

### MCP Cursor — encore à reconfigurer

| | |
|-|-|
| Projet attendu | `ykzpdfwwjjdlhaulsaur` |
| MCP actuellement connecté | `slyizcavccnkvxqtmfmd` (autre application) |

**Action** : copier `.cursor/mcp.json.example` → `.cursor/mcp.json`, y mettre votre **nouveau** `SUPABASE_ACCESS_TOKEN` (compte Supabase, pas le projet), redémarrer Cursor. Ensuite je pourrai lister les tables réelles de RESTAURANTGLASCE et appliquer la migration GLACE via MCP.

### Tables Prisma vs base (à revérifier après MCP corrigé)

| Modèle Prisma | Table attendue | Présente en base MCP ? |
|---------------|----------------|------------------------|
| `DeliveryZone` | `DeliveryZone` | ❌ Absente |
| `DeliverySchedule` | `DeliverySchedule` | ❌ Absente |
| `Order` | `Order` | ❌ Absente |
| `OrderItem` | `OrderItem` | ❌ Absente |

**Tables réelles en base MCP (22 tables)** : `groups`, `profiles`, `transactions`, `btc_*`, `payment_requests`, `notifications`, etc. — **aucune liée à GLACE**.

### Migrations Supabase (projet MCP actuel)

23 migrations appliquées (`init_tontine_schema` → `link_whatsapp_profile`). **Aucune migration Ah Mes Goûts.**

### État persistance dans le code Next.js

| Couche | Statut |
|--------|--------|
| Prisma schema | ✅ Défini (`prisma/schema.prisma` + `directUrl`) |
| `@prisma/client` branché | ❌ Non utilisé en runtime |
| Stockage actuel | ✅ Fichiers JSON (`data/*.json`) + mémoire serveur |
| Migration GLACE prête | ✅ `supabase/migrations/20260701180000_amg_ice_cream_schema.sql` |

**Action requise** : reconfigurer le MCP sur `ykzpdfwwjjdlhaulsaur`, appliquer `supabase/migrations/20260701180000_amg_ice_cream_schema.sql`, puis brancher Prisma.

---

## 2. Row Level Security (RLS) — audit table par table

### Projet MCP actuel (tontine — hors scope GLACE)

Toutes les 22 tables publiques ont **RLS activé** ✅ (vérifié via `list_tables` MCP).

### Tables Ah Mes Goûts (après migration GLACE)

| Table | RLS prévu | Policy |
|-------|-----------|--------|
| `DeliveryZone` | ✅ Activé | Lecture publique (`SELECT`) |
| `DeliverySchedule` | ✅ Activé | Lecture créneaux actifs uniquement |
| `Order` | ✅ Activé | Accès anon refusé — API serveur (service role) |
| `OrderItem` | ✅ Activé | Accès anon refusé — API serveur |

**À compléter avant prod** : policies JWT pour suivi commande par token client + rôle `admin` pour le back-office.

---

## 3. Robustesse & fiabilité

| Élément | Statut |
|---------|--------|
| Retry 3× backoff sur sauvegarde commande | ✅ `lib/server/retry.ts` + `saveServerOrderWithRetry` |
| Idempotency-Key sur `POST /api/orders` | ✅ Anti double-clic / double soumission |
| Bouton paiement désactivé pendant traitement | ✅ `payingRef` + `uiState === loading` |
| `processPayment()` centralisé | ✅ `lib/payments/process-payment.ts` |
| Paiement mock non dispersé | ✅ Un seul point d'entrée |
| Cron menus : erreur loggée + journal admin | ✅ `menu_activation_failed` |
| Health check `/api/health` | ✅ 200 / 503 |
| Error boundary checkout | ✅ |
| Error boundary admin | ✅ |
| Try/catch API commandes avec message utile | ✅ |

---

## 4. Google Maps

| Page | Intégration | Clé API requise ? |
|------|-------------|-------------------|
| `/zones-de-livraison` | ✅ Iframe embed + bouton Itinéraire | ❌ Non |
| `/contact` | ✅ Carte + téléphone + e-mail | ❌ Non |
| Polygones zones (Cadjehoun, etc.) | ⏳ Non implémenté | ✅ Oui (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` + restriction domaine) |

Coordonnées boutique : `6.3654, 2.4183` (Cotonou) — `lib/maps/shop-location.ts`.

---

## 5. Paiements — volontairement en attente

| | |
|-|-|
| MTN MoMo / Moov / Celtiis / Carte | ⏳ **Mock actif** — ne pas ouvrir au public sans agrégateur |
| Point d'extension | `lib/payments/process-payment.ts` |
| TODO dans le code | `// TODO: brancher l'agrégateur Mobile Money réel — GeniusPay/FeexPay` |

Variables à fournir plus tard : `MOMO_*`, `GENIUSPAY_API_KEY` (voir `.env.example`).

---

## 6. CMS & admin

| Fonctionnalité | Statut |
|----------------|--------|
| Éditeur de site `/admin/site-builder` | ✅ |
| Paramètres hub `/admin/parametres` | ✅ |
| Contenu landing branché sur CMS publié | ✅ |
| Upload images (Cloudinary ou local) | ✅ |

---

## 7. Prêt pour la mise en ligne ✅

- [x] Landing premium + CMS contenu
- [x] Checkout complet (hors paiement réel)
- [x] Menus programmés + cron
- [x] Admin commandes / produits / livraison
- [x] Suivi commande + WhatsApp
- [x] SEO (sitemap, metadata, zones, FAQ)
- [x] Bande typo accessible (scroll 28s ou rotation)
- [x] Health check monitoring
- [x] Error boundaries sections critiques
- [x] Google Maps embed (contact + zones)
- [x] Build Next.js passe

---

## 8. En attente avant ouverture publique ⏳

- [ ] **MCP Cursor** pointant sur `ykzpdfwwjjdlhaulsaur` (pas `slyizcavccnkvxqtmfmd`)
- [ ] Clés dans `.env.local` depuis le [dashboard API](https://supabase.com/dashboard/project/ykzpdfwwjjdlhaulsaur/settings/api)
- [ ] Appliquer `supabase/migrations/20260701180000_amg_ice_cream_schema.sql`
- [ ] Brancher Prisma (`@prisma/client`) et migrer depuis JSON
- [ ] Policies RLS suivi commande + admin JWT
- [ ] **Agrégateur Mobile Money réel** (`processPayment`)
- [ ] Auth admin production (JWT / sessions — actuellement `ADMIN_DEV_OPEN`)
- [ ] `CRON_SECRET` en production (Vercel)
- [ ] `NEXT_PUBLIC_SITE_URL` production
- [ ] Cloudinary prod (`CLOUDINARY_*`) pour uploads CMS
- [ ] SMS notifications (`SMS_PROVIDER_API_KEY`)
- [ ] (Optionnel) Polygones zones Google Maps JS API

---

## 9. Clés & configuration à fournir

| Variable | Obligatoire pour | Fourni ? |
|----------|------------------|----------|
| `SUPABASE_ACCESS_TOKEN` | MCP Cursor (local) | ⚠️ Régénérer (fuite) |
| `DATABASE_URL` (pooler 6543) | Prisma runtime | ❌ |
| `DIRECT_URL` (5432) | Migrations Prisma | ❌ |
| `NEXT_PUBLIC_SUPABASE_URL` | Client Supabase | ❌ |
| `SUPABASE_SERVICE_ROLE_KEY` | API serveur | ❌ |
| `CRON_SECRET` | Cron Vercel menus | ❌ |
| `CLOUDINARY_*` | Upload images admin | ❌ |
| `GENIUSPAY_API_KEY` / MoMo | Paiements réels | ❌ |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Polygones zones | ❌ (embed OK sans) |

---

## 10. Config MCP recommandée

1. Copier `.cursor/mcp.json.example` → `.cursor/mcp.json`
2. Remplacer `VOTRE_PROJECT_REF` par le ref du **nouveau** projet GLACE
3. Coller le **nouveau** token (jamais dans Git)
4. Redémarrer Cursor

---

## 11. Tests rapides post-déploiement

```bash
curl https://votre-domaine.bj/api/health
# → {"status":"healthy",...}

# Admin (dev)
ADMIN_DEV_OPEN=true npm run dev
# → /admin/site-builder, /admin/parametres

# Carte
# → /contact, /zones-de-livraison
```

---

*Ce document reflète l'état réel vérifié via MCP Supabase — pas une supposition.*
