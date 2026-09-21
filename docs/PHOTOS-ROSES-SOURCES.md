# Photos des compositions de roses — sources et licences

## Le problème réglé

Neuf fiches fleurs partageaient la même photo `bouquet-roses.webp` : la fiche
« 1 rose » et la fiche « 20 roses » affichaient exactement le même visuel.
Chaque palier a maintenant **son propre visuel**, choisi pour coller au nombre
annoncé.

## D'où viennent ces images

Des **photos de banque d'images (Pexels)**, sous
[Pexels License](https://www.pexels.com/license/) : usage commercial autorisé,
attribution non requise.

**Ce ne sont pas les bouquets de la boutique.** Elles vivent sous
`public/images/placeholders/` et non sous `public/images/produits/` : c'est la
convention de rangement qui permet de savoir, dans le dépôt, quelles fiches
tournent encore sur une photo de banque d'images et lesquelles ont une vraie
photo d'atelier. L'interface ne le signale plus à la cliente.

Les vrais bouquets de la boutique sont les fiches **7, 9 et 12 roses** — leurs
photos sont dans `public/images/produits/`.

## Où le compte est exact

| Fiche | Compte | Visuel |
|---|---|---|
| `rose-unite` | **1 — exact** | une rose, tige nue |
| `bouquet-1-rose` | **1 — exact** | une rose emballée en cornet |
| `bouquet-2-roses` | **2 — exact** | deux roses rouges |
| `bouquet-3-roses` | **3 — exact** | trois roses rouges |
| `bouquet-5-roses` | ≈ 6 | une poignée de roses rouges |
| `bouquet-10-roses` | ≈ 10 | bouquet emballé, roses rouges et crème, gypsophile |
| `bouquet-15-roses` | ≈ 12 | bouquet lié, roses serrées |
| `bouquet-20-roses` | masse | grande composition |

**Honnêteté sur les comptes** : 1, 2 et 3 sont exacts au poil. Pour 5, 10, 15 et
20, les visuels retenus sont les plus proches trouvés — comptés à la main sur
chaque candidat, jamais d'après le titre.

**La recherche a été poussée jusqu'au bout, et elle est close.** Ne la refaites
pas sans une raison nouvelle. Ce qui a été essayé :

| Source | Résultat |
|---|---|
| Pexels (via moteur de recherche) | a répondu trois fois puis bloqué (HTTP 202) |
| Unsplash | bloqué (protection anti-robot) |
| Pixabay | 403 |
| Openverse | 123 candidats moissonnés et comptés un par un — aucun 10/15/20 exact |
| Wikimedia Commons | ni les descriptions (`insource:`) ni les noms de fichiers ne portent le compte |
| StockSnap | exploitable, mais petite banque sans compte étiqueté |

Le fait qui bloque tout : **aucune banque d'images ne classe ses photos par
nombre de fleurs.** 1, 2 et 3 se trouvent parce que le compte est évident et
souvent dans le titre. Au-delà, il faut ouvrir chaque photo et compter. Plus de
160 candidates ont été ouvertes : 10, 15 et 20 roses comptables n'y existent
pratiquement pas.

Deux voies resteraient, si le besoin revient : une **clé API Pexels** (gratuite,
immédiate) pour tirer des centaines de photos professionnelles et les compter,
ou — seule voie qui garantit le compte — la **photo d'atelier** de chaque
palier. Décision prise : on en reste aux visuels actuels.

## Tableau des sources

Généré par `scripts/import-rose-placeholders.mjs` dans
`data/rose-placeholders-manifest.json`.

| Fiche | Source | Licence |
|---|---|---|
| `rose-unite` | [Pexels 6616436](https://www.pexels.com/photo/6616436/) | Pexels License |
| `bouquet-1-rose` | [Pexels 12252125](https://www.pexels.com/photo/12252125/) | Pexels License |
| `bouquet-2-roses` | [Pexels 1161751](https://www.pexels.com/photo/1161751/) | Pexels License |
| `bouquet-3-roses` | [Pexels 6616438](https://www.pexels.com/photo/6616438/) | Pexels License |
| `bouquet-5-roses` | [Pexels 34051908](https://www.pexels.com/photo/34051908/) | Pexels License |
| `bouquet-10-roses` | [Pexels 39617403](https://www.pexels.com/photo/39617403/) | Pexels License |
| `bouquet-15-roses` | [Pexels 31069852](https://www.pexels.com/photo/31069852/) | Pexels License |
| `bouquet-20-roses` | [Pexels 35400909](https://www.pexels.com/photo/35400909/) | Pexels License |

## Ce qui n'a PAS été touché

- `bouquet-7-roses`, `bouquet-9-roses`, `bouquet-12-roses` : **vraies photos de
  l'atelier**, déjà en place.
- `bouquet-roses` (fiche générique) : garde son visuel.

## Remplacer un visuel par une vraie photo

Un par un, sans toucher au reste : téléverser la vraie photo depuis
`/admin/produits` (la vignette de la ligne est le bouton), ou déposer un fichier
800×800 WebP dans `public/images/produits/`. Retirer ensuite l'entrée
correspondante de `PRODUCT_IMAGES` (`lib/product-images.ts`) pour que vider
l'image en base ne fasse pas réapparaître le visuel de banque d'images.

## Rejouer l'import

```bash
node scripts/import-rose-placeholders.mjs --dry-run   # n'écrit rien
node scripts/import-rose-placeholders.mjs
```

Additif et idempotent : aucun `delete`, aucune fiche créée ou supprimée, seuls
`imageUrl` et `imageUrls` des huit slugs listés sont écrits.
