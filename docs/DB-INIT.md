# Initialisation base — Gift & ENTREMETS (Supabase + Prisma)

Projet Supabase : `ykzpdfwwjjdlhaulsaur` (RESTAURANTGLASCE)

## Prérequis

- `.env` ou `.env.local` avec `DATABASE_URL` (pooler `:6543`) et `DIRECT_URL` (pooler `:5432`)
- Format pooler recommandé : `aws-0-eu-west-1.pooler.supabase.com` (l'hôte `db.*.supabase.co` peut être bloqué en local)

## Commandes (dans l'ordre)

```bash
cd c:\Users\DELL\GLACE

# 1. Installer deps + client Prisma
npm install
npx prisma generate

# 2. Appliquer toutes les migrations Prisma
npx prisma migrate deploy

# 3. Inspecter l'état actuel (tables, colonnes, RLS, Realtime)
npm run db:inspect

# 4. Seed minimal (produits si vide, 2 livreurs démo, menus si vide)
npm run seed:db

# 5. Health check complet (échoue si quelque chose manque)
npm run db:health
```

## Migrations appliquées

| Migration | Contenu |
|-----------|---------|
| `20260701180000_amg_ice_cream_schema` | Order, OrderItem, DeliveryZone, DeliverySchedule, enums, RLS Order |
| `20260702100000_catalog_cms_menus` | Product, Menu, SiteContentStore, SiteSettingsStore, AdminActionLog |
| `20260702140000_drivers_and_order_realtime` | Driver, colonnes driverId/driverStartedAt/driverDeliveredAt, Realtime Order, RLS Driver |

Fichiers miroir Supabase : `supabase/migrations/` (même SQL, pour référence / MCP).

## RLS (sécurité)

| Table | Politique |
|-------|-----------|
| `Order` | `order_deny_anon` — accès anon refusé (API serveur via service role) |
| `OrderItem` | `order_item_deny_anon` — idem |
| `Driver` | `driver_deny_anon` — idem |
| `Product` | lecture publique SELECT |
| `Menu` | lecture publique SELECT |
| `SiteContentStore` / `SiteSettingsStore` / `AdminActionLog` | accès anon refusé |

## Realtime

La table `Order` est publiée sur `supabase_realtime` pour les mises à jour de statut (suivi client / admin / livreur).

## Vérification manuelle (optionnel)

```bash
npx prisma db pull --print   # introspection — doit lister tous les modèles
npm run db:inspect           # résumé lisible
npm run db:health            # exit 0 = OK
```

## Seed existant (fichiers locaux, legacy)

`npm run seed` — seed Postgres uniquement (`scripts/seed-db.mjs`). Plus d'écriture `data/*.json`.

Pour peupler la vraie base : **`npm run seed:db`**.
