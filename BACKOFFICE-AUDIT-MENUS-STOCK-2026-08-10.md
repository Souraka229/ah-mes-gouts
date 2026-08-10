# Audit back-office — Menus, Stock, Menu du jour, Programmation

Analyse du code réel (pas une supposition) — 10 août 2026.

---

## 🔴 1. Bug confirmé — le stock n'est jamais restauré

**C'est le point le plus important de cet audit.**

Quand un client commence une commande, le stock est décrémenté **immédiatement** à la
création de la commande (`recue`), avant même que le paiement soit confirmé
(`lib/server/order-repository.ts`, décrément atomique correct côté DB — ça au moins,
c'est bien fait, pas de survente possible).

Le problème : si le paiement **échoue ou est abandonné**, la commande passe à `annulee`
(ou reste invisible avec la nouvelle règle qu'on a mise en place), mais **le stock
décrémenté n'est jamais rendu**. J'ai vérifié dans `expirePendingOrder` /
`expireAllPendingOrders` — ça change juste le statut, aucun `increment` nulle part dans
tout `order-repository.ts`.

**Conséquence concrète** : chaque panier abandonné, chaque paiement qui échoue, chaque
test que tu fais toi-même en sandbox — le stock du produit baisse et ne remonte jamais.
Avec le temps, le stock affiché en admin devient de moins en moins fiable, et des
produits vont sembler épuisés (`stockRemaining: 0`) alors qu'aucune vente réelle n'a eu
lieu. Et comme les commandes non payées sont maintenant invisibles côté admin (la règle
qu'on vient d'implémenter), il n'y a même plus de trace visible pour comprendre pourquoi
le stock a bougé.

**À corriger** : restaurer le stock (increment) quand une commande passe à `annulee`
depuis `recue` (paiement jamais confirmé) — que ce soit via l'expiration automatique ou
une annulation manuelle avant confirmation. Ne pas restaurer si la commande était déjà
`paiement_confirme` et qu'on annule après coup (là, c'est un choix métier différent —
peut-être remettre en stock aussi, à voir avec toi).

---

## 🟠 2. Bug de cache — plusieurs admins/visiteurs peuvent voir des données différentes

Les menus (`lib/server/menu-repository.ts`) et le catalogue produits
(`lib/server/admin-catalog-repository.ts`) sont mis en cache **en mémoire du process**
(`globalThis.__amgMenus`, `globalThis.__amgAdminCatalog`), pas dans une base partagée
type Redis.

Sur Vercel, chaque requête peut atterrir sur une instance serveur différente. Résultat
possible : un admin modifie le menu du jour ou le stock sur une instance, mais une autre
instance (qui sert peut-être un client au même moment) continue de montrer l'ancienne
version jusqu'à ce qu'elle redémarre. Ce n'est pas systématique (souvent la même instance
sert plusieurs requêtes de suite), mais c'est **imprévisible** — exactement le genre de
bug qui donne l'impression que "parfois ça marche, parfois non" sans raison apparente.

C'était déjà identifié comme risque P0 dans `SIMPLICITE-ET-SCALABILITE.md` — je le
remonte ici parce que ça touche directement menus + stock, les deux sujets que tu me
demandes d'auditer. Pas corrigé aujourd'hui (nécessite Redis/Upstash ou équivalent),
mais c'est la cause racine la plus probable de tout comportement "incohérent" que vous
avez pu observer sur le menu du jour ou les stocks.

---

## 3. Menus — structure et fonctionnement

**Ce qui est bien pensé :**
- Vue calendrier semaine/mois pour programmer les menus à l'avance.
- Duplication d'un menu vers un autre jour (bouton "Copier").
- Un menu `active` est verrouillé en édition (`MENU_ACTIVE_LOCKED`) sauf forçage
  explicite — évite les modifications accidentelles en plein service.
- Résolution robuste produit par ID **puis** par slug — évite un menu du jour vide
  après un reseed catalogue (bon réflexe défensif, déjà pensé).

**Points d'amélioration :**
- `writeMenusToDb` fait un `deleteMany()` + `createMany()` sur **toute la table menus**
  à chaque sauvegarde, même pour éditer un seul jour. Fonctionnellement ça marche (les
  ID sont préservés), mais si deux personnes sauvegardent au même moment, il y a un
  risque réel de collision (l'une écrase le travail de l'autre). À corriger en un
  `update` ciblé sur la ligne modifiée plutôt qu'un delete/recreate global.
- Aucune limite ni avertissement si un menu est créé sans aucun produit sélectionné —
  le menu du jour serait juste vide pour les clients, sans alerte admin.
- Pas de vue "historique" des menus passés au-delà de ce que montre le calendrier —
  utile pour comparer les performances d'un menu à un autre (ça rejoint la partie
  analytics qu'on a construite hier, pourrait s'y brancher).

---

## 4. Menu du jour — activation

**Ce qui est bien pensé :**
- Le stock du jour (`dailyStock` par produit) est automatiquement remis au niveau
  cible **au moment de l'activation** du menu — bon principe pour un menu quotidien à
  quantité limitée.
- Activation "paresseuse" : si le cron rate un créneau, la première visite client
  après l'heure prévue déclenche quand même l'activation (`getShopProductsFromActiveMenu`
  appelle `activateDueMenus()` avant de lire le menu actif) — bon filet de sécurité.

**Points d'amélioration :**
- Si un menu est dupliqué/créé sans définir de `dailyStock` par produit (reste à `0`
  = "illimité" par convention), le stock **n'est pas réinitialisé** à l'activation — le
  produit garde son stock résiduel de la veille, silencieusement. Un admin qui oublie
  de remplir les quantités du jour peut se retrouver avec un produit à 0 en stock toute
  la journée sans alerte claire expliquant pourquoi.
- Le cron unique (8h UTC, soit ~9h Cotonou) ne correspond pas à l'heure d'activation
  par défaut des menus programmés (20h) — dans la pratique ce n'est pas grave grâce à
  l'activation paresseuse, mais **seulement s'il y a du trafic** peu après 20h. Si le
  site est totalement calme le soir, le nouveau menu n'apparaît vraiment qu'au premier
  visiteur du lendemain (ou au cron de 8h). À surveiller si vous comptez sur une
  bascule précise à 20h pour une communication ("nouveau menu ce soir").

---

## 5. Stock — au-delà du bug de restauration

**Ce qui est bien pensé :**
- Décrément atomique côté DB (`stockRemaining >= quantity` conditionnel) — pas de
  survente possible même avec des commandes simultanées, c'est du bon travail déjà en
  place.
- Alerte "stock bas" (`stockMinimum`, défaut 5) déjà remontée dans les alertes du
  cockpit admin.

**Points d'amélioration :**
- Pas de trace/historique des mouvements de stock (pourquoi un produit est passé de
  12 à 3 — vente ? correction manuelle ? bug ?). Un simple journal d'audit (déjà
  existant pour les actions admin via `admin-action-log`) pourrait aussi logger les
  changements de stock, ce qui aiderait à diagnostiquer le bug du point 1 une fois
  corrigé.
- Pas de réapprovisionnement en masse ("+10 sur tous les produits du menu du jour") —
  seulement produit par produit dans l'éditeur de menu actuellement.

---

## 6. Programmation (crons)

Deux crons actifs (`vercel.json`) :
- `0 8 * * *` → activation des menus programmés
- `0 19 * * *` → résumé Telegram quotidien

Les deux sont protégés par `CRON_SECRET` en production — correct. Le cron d'activation
logue proprement les échecs dans le journal admin (`menu_activation_failed`) avec un
message clair. Bon point : en cas d'échec, **le menu actif précédent reste en place**
(pas de rupture de service), c'est le bon comportement par défaut.

Pas de point négatif majeur ici — c'est la partie la plus solide des quatre.

---

## Priorités si tu veux qu'on corrige

| # | Sujet | Urgence | Effort |
|---|---|---|---|
| 1 | Stock jamais restauré après paiement échoué/abandonné | 🔴 Haute — fausse tes chiffres de stock en continu | Moyen |
| 2 | Cache en mémoire (menus + catalogue) désynchronisé entre instances | 🟠 Moyenne — imprévisible mais pas systématique | Plus lourd (Redis) |
| 3 | `writeMenusToDb` delete/recreate global → risque de collision | 🟡 Faible aujourd'hui (petite équipe) | Faible |
| 4 | Pas d'alerte si menu créé sans `dailyStock` défini | 🟡 Faible | Faible |
| 5 | Pas d'historique des mouvements de stock | 🟢 Confort | Faible |

Dis-moi lesquels tu veux que je traite, je peux commencer par le #1 (le plus important)
dès que tu confirmes.
