# Plan de cadrage — Back-office & boutique Gift & ENTREMETS

> Document pour le/la responsable boutique — **simple, sans jargon technique**.  
> Objectif : une interface **facile comme WhatsApp**, pas un ERP.

**Date** : juillet 2026 · **Version** : 1.0

---

## 1. Pourquoi ce document ?

Le système actuel mélange trop de choses : formulaires longs, 6 étapes au checkout, catégories floues, stock menu du jour confondu avec nounours/cartes cadeaux.

**Ce plan fixe les règles** avant de coder — pour que vous sachiez exactement ce que vous aurez à faire au quotidien.

---

## 2. Principe : 3 types de produits seulement

| Type | Exemples | Stock | Visible où |
|------|----------|-------|------------|
| **Entremets / Menu du jour** | Vanilla Caramel, Tiramisu… | **Limité par jour** — quand c'est fini, c'est fini | Accueil + Catalogue « Menu » |
| **Nounours** | Nounours beige, rose… | **Toujours commandable** (pas de rupture auto) | Catalogue « Nounours » + Upsell |
| **Carte** | Carte cadeau | **Toujours commandable** | Catalogue « Carte » + Upsell |

> Règle d'or : **seuls les entremets du menu actif** consomment le stock du jour. Nounours et cartes ne bloquent jamais une commande.

---

## 3. Parcours client — 2 étapes (plus 6)

```
┌─────────────────────────────────────┐
│  ÉTAPE 1 — Votre commande           │
│  • Mode (sur place / emporter /     │
│    livraison)                       │
│  • Zone (si livraison)              │
│  • Créneau horaire                  │
│  • Nom + téléphone + adresse        │
│  • Suggestions Nounours / Carte     │
│         [ Continuer → ]             │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  ÉTAPE 2 — Paiement                 │
│  • MTN / Moov / Celtiis / Carte     │
│         [ Payer ]                   │
└─────────────────────────────────────┘
```

**Gain** : moins de clics, moins d'abandon sur mobile Android.

---

## 4. Back-office — 4 écrans (pas 16)

| Écran | Vous faites quoi | Fréquence |
|-------|------------------|-----------|
| **Commandes** | Voir, préparer, livrer | Toute la journée |
| **Produits** | Ajouter / prix / photo / dispo | 2–3× par semaine |
| **Menu du jour** | Choisir les entremets du jour + stock | **1× par jour (20h)** |
| **Livraison** | Zones A–E, horaires | Rare |

Tout le reste (CRM, journal, cockpit…) → **masqué** ou fusionné.

---

## 5. Écran Produits — CRUD ultra-simple

### Ajouter un produit = 4 champs

1. **Nom** (ex. « Nounours rose »)
2. **Catégorie** : Entremets · Menu du jour · **Nounours** · **Carte**
3. **Prix** (FCFA)
4. **Photo** (vous prenez avec le téléphone → **optimisée automatiquement**)

C'est tout. Pas de 12 cases à cocher.

### Par onglet

```
[ Entremets ] [ Menu du jour ] [ Nounours ] [ Carte ]
```

- **Nounours** : liste de tous les nounours, bouton « + Ajouter »
- **Carte** : cartes cadeaux
- **Entremets** : catalogue principal
- **Menu du jour** : raccourci vers l'écran menu (section 6)

### Actions rapides sur chaque ligne

| Bouton | Effet |
|--------|-------|
| **Dispo / Épuisé** | Masque du site (entremets seulement) |
| **Prix** | Modifier en 1 clic |
| **Photo** | Remplacer (auto WebP) |

---

## 6. Menu du jour — logique métier

```
Soir (20h)  →  Admin choisit les entremets + stock du lendemain
Matin       →  Cron active le menu automatiquement
Journée     →  Clients ne voient QUE ces entremets en « Menu du jour »
Stock = 0   →  Produit disparaît du menu (pas du catalogue entremets)
```

**Nounours / Carte** : hors menu du jour, toujours en upsell.

---

## 7. Stock — règles claires

| Catégorie | Stock diminue quand ? | Peut être « épuisé » ? |
|-----------|----------------------|-------------------------|
| Entremets (menu actif) | Paiement confirmé | Oui |
| Entremets (hors menu) | Paiement confirmé | Oui |
| **Nounours** | Jamais (suivi info seulement) | Non |
| **Carte** | Jamais | Non |

---

## 8. Upsell (suggestions avant paiement)

Affiche automatiquement :

- Tous les produits **catégorie Nounours** (max 2)
- Toutes les **Cartes** (max 1)
- Skip évident : « Non merci, continuer »

Géré depuis l'onglet **Nounours** / **Carte** — pas de réglage séparé.

---

## 9. Temps réel

| Événement | Qui voit quoi |
|-----------|---------------|
| Nouvelle commande | Admin : son + carte KDS |
| Statut changé | Client : page suivi |
| Stock entremet = 0 | Catalogue : badge Épuisé |
| Menu activé 20h | Accueil : nouveaux produits |

---

## 10. Phases de livraison

### Phase A — Maintenant (1 semaine) ✅ en cours

- [x] Checkout 2 étapes
- [x] Catégories Nounours + Carte
- [x] Upsell depuis catégories
- [x] Stock illimité Nounours/Carte
- [ ] CRUD produits simplifié (4 champs)
- [ ] Onglets par catégorie admin

### Phase B — Semaine 2

- [ ] Menu du jour : écran unique (produits + stock jour)
- [ ] Photos auto WebP/AVIF à l'upload
- [ ] Masquer écrans admin inutiles

### Phase C — Semaine 3

- [ ] Alertes stock bas (Telegram)
- [ ] Stats simples (commandes du jour)
- [ ] Formation 30 min sur site

---

## 11. Ce qu'on retire (simplicité)

- Formulaire produit actuel (trop long)
- 6 étapes checkout
- CRM / OTP client
- Cockpit séparé
- Import manuel compliqué

---

## 12. Formation prévue (30 min)

1. **5 min** — Voir une commande, changer le statut
2. **10 min** — Ajouter un nounours (nom, prix, photo)
3. **10 min** — Préparer le menu du lendemain
4. **5 min** — Changer un prix / masquer un produit

---

## 13. Validation

| Question | Réponse |
|----------|---------|
| C'est plus simple qu'avant ? | Oui — 4 champs, 4 écrans admin, 2 étapes client |
| Je peux gérer seul(e) ? | Oui — sans développeur au quotidien |
| Les nounours se vendent toujours ? | Oui — jamais bloqués par stock |
| Le menu du jour reste strict ? | Oui — stock jour par entremet |

---

*Document vivant — validé avec le responsable boutique avant Phase B.*
