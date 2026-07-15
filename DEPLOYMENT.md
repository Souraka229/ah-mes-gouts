# Déploiement production — Gift & ENTREMETS

Guide pas-à-pas pour la mise en ligne sur **Vercel** (`gift-entremets`) + **Supabase** (projet `ykzpdfwwjjdlhaulsaur`).

**Projet Vercel** : [souraka017-8383s-projects/gift-entremets](https://vercel.com/souraka017-8383s-projects/gift-entremets)  
**URL** : https://gift-entremets.vercel.app  
**Supabase** : https://ykzpdfwwjjdlhaulsaur.supabase.co

---

## État actuel (audit local)

| Élément | Statut |
|---------|--------|
| Projet Vercel dédié | ✅ `gift-entremets` (lié dans `.vercel/`) |
| Env Production | ✅ DATABASE_URL, Supabase, ADMIN_ACCESS_TOKENS, CRON_SECRET, CRM_OTP_PEPPER |
| Base Postgres | ✅ CRM + DeliveryOptions + visiteurs / Telegram |
| Realtime suivi commande | ✅ `OrderStatusFeed` |
| Paiement réel | **Mock** — ouverture publique sans encaissement réel possible |
| Admin prod | Liens magiques `ADMIN_ACCESS_TOKENS` (pas `ADMIN_DEV_OPEN`) |

---

## 1. Appliquer les migrations (obligatoire)

Depuis votre machine, avec `.env.local` pointant sur Supabase :

```bash
npx prisma migrate deploy
npm run db:health
```

Migrations en attente au dernier audit :

- `20260710140000_delivery_options`
- `20260713100000_reception_mode_dinein`
- `20260715120000_crm_customers`
- `20260715120000_site_visitors_telegram`

---

## 2. Variables d'environnement Vercel

**Settings → Environment Variables → Production** (et Preview si besoin).

### Obligatoires

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Pooler Supabase port **6543** + `?pgbouncer=true` |
| `DIRECT_URL` | Connexion directe port **5432** (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ykzpdfwwjjdlhaulsaur.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement — jamais côté client |
| `NEXT_PUBLIC_SITE_URL` | `https://ahmesgouts.bj` (sans slash final) |
| `ADMIN_ACCESS_TOKENS` | JSON — voir §4 |
| `CRON_SECRET` | Chaîne aléatoire longue (crons Vercel) |
| `CRM_OTP_PEPPER` | Chaîne aléatoire longue (hash OTP clients) |

### Recommandées

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_INSTAGRAM_URL` | Lien Instagram réel |
| `NEXT_PUBLIC_INSTAGRAM_HANDLE` | `@ahmesgouts` |
| `CLOUDINARY_CLOUD_NAME` | Upload images admin |
| `CLOUDINARY_UPLOAD_PRESET` | Preset unsigned ou signed |
| `TELEGRAM_BOT_TOKEN` | Alertes cheffe (optionnel) |
| `TELEGRAM_BOT_USERNAME` | Sans @ |
| `TELEGRAM_LINK_SECRET` | Liaison Telegram admin |
| `TELEGRAM_WEBHOOK_SECRET` | Secret webhook Telegram |

### Interdites en production

| Variable | Raison |
|----------|--------|
| `ADMIN_DEV_OPEN=true` | Admin ouvert sans token |
| `CRM_OTP_DEV_RETURN=true` | Code OTP exposé dans l'API |

Vérifier localement (sans déployer) :

```bash
npm run deploy:check
```

---

## 3. Vercel — configuration projet

1. **Lier le repo** (si pas déjà fait) :
   ```bash
   npx vercel link
   ```
2. **Node.js** : aligner sur `package.json` → **20.x**  
   (Dashboard → Settings → General → Node.js Version)
3. **Build** : laisser par défaut — `npm run build` (`prisma generate && next build`)
4. **Crons** : déjà dans `vercel.json` :
   - 08h00 — activation menus
   - 19h00 — résumé Telegram

Sur plan **Hobby**, les crons Vercel sont limités — passer en **Pro** si besoin.

---

## 4. Tokens admin (cheffe + équipe)

```bash
node scripts/generate-admin-links.mjs https://ahmesgouts.bj 90
```

Copier la ligne `ADMIN_ACCESS_TOKENS=...` dans Vercel Production.

Connexion :

```
https://ahmesgouts.bj/admin/entree?token=amg_xxx
```

Révoquer un employé : ajouter `"revokedAt":"2026-07-15T00:00:00.000Z"` sur **son** entrée JSON uniquement.

---

## 5. Données initiales

Si catalogue vide en prod :

```bash
npm run seed:db
```

(Depuis votre machine avec `DATABASE_URL` prod — **une seule fois**.)

---

## 6. Domaine

1. Vercel → **Domains** → ajouter `ahmesgouts.bj`
2. DNS chez le registrar : enregistrements indiqués par Vercel (A / CNAME)
3. Redirection `www` → déjà dans `vercel.json`

---

## 7. Déployer

```bash
git add .
git commit -m "chore: ready for production deploy"
git push origin main
```

Ou déploiement manuel :

```bash
npx vercel --prod
```

---

## 8. Post-déploiement — checklist

```bash
curl https://ahmesgouts.bj/api/health
# → status: "healthy"

# Admin (token fondateur)
# → https://ahmesgouts.bj/admin/entree?token=...

# Boutique
# → / , /catalogue , /checkout , /infos

# SEO
# → /sitemap.xml , /robots.txt
```

| Test | Attendu |
|------|---------|
| `/api/health` | 200, postgres OK |
| Admin sans token | Redirection `/?admin=locked` |
| Nouvelle commande | Enregistrée en base |
| Suivi commande | Mise à jour sans reload (Realtime) |
| Cron menus 8h | Log Vercel + menu activé |
| OTP client | Code **non** renvoyé dans JSON |

---

## 9. Telegram (optionnel)

1. Créer le bot via @BotFather
2. Variables `TELEGRAM_*` sur Vercel
3. Webhook :
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://ahmesgouts.bj/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```
4. Admin → Paramètres → Notifications → **Connecter mon Telegram**

---

## 10. Ce qui reste volontairement hors scope

- Paiement Mobile Money / carte réel (`processPayment` mock)
- NestJS backend séparé
- SMS OTP production (brancher `CRM_OTP_WEBHOOK_URL`)
- Pages légales CGV / mentions (liens footer)

---

## Commandes utiles

```bash
npm run deploy:check    # vérif env + migrations
npm run db:health       # santé Postgres détaillée
npm run build           # build prod (arrêter dev avant)
npx prisma migrate deploy
npm run seed:db
```

---

*Dernière mise à jour : juillet 2026 — Gift & ENTREMETS by Ah Mes Goûts*
