# Photos des compositions de roses — sources et licences

## Le problème réglé

Neuf fiches fleurs partageaient la même photo `bouquet-roses.webp` : la fiche
« 1 rose » et la fiche « 20 roses » affichaient exactement le même visuel.
Chaque palier a maintenant **son propre visuel**, du plus petit au plus grand.

## D'où viennent ces images

Ce sont des **photos de banque d'images (Pexels)**, sous
[Pexels License](https://www.pexels.com/license/) : usage commercial autorisé,
attribution non requise.

**Ce ne sont pas les bouquets de la boutique.** C'est pourquoi elles vivent sous
`public/images/placeholders/` et non sous `public/images/produits/` : ce préfixe
est la source unique de vérité de `isReferenceVisual`
(`lib/product-images.ts`) et déclenche automatiquement le badge
« Visuel indicatif — Photos non contractuelles » sur la fiche produit, la
galerie et le back-office.

Elles ne prétendent pas reproduire exactement le nombre de roses annoncé — le
badge le dit déjà. Elles servent à ce que chaque palier soit **reconnaissable au
premier coup d'œil**, en attendant les vraies photos.

## Tableau des sources

Généré par `scripts/import-rose-placeholders.mjs` dans
`data/rose-placeholders-manifest.json`.

| Fiche | Visuel | Source | Licence |
|---|---|---|---|
| `rose-unite` | Une rose, tige nue | [Pexels 6616436](https://www.pexels.com/photo/6616436/) | Pexels License |
| `bouquet-1-rose` | Une rose emballée en cornet | [Pexels 12252125](https://www.pexels.com/photo/12252125/) | Pexels License |
| `bouquet-2-roses` | Petit bouquet serré, gypsophile, nœud | [Pexels 29741224](https://www.pexels.com/photo/29741224/) | Pexels License |
| `bouquet-3-roses` | Trois roses | [Pexels 6616438](https://www.pexels.com/photo/6616438/) | Pexels License |
| `bouquet-5-roses` | Bouquet lié, boutons serrés | [Pexels 31069852](https://www.pexels.com/photo/31069852/) | Pexels License |
| `bouquet-10-roses` | Roses en nombre, feuillage | [Pexels 34051908](https://www.pexels.com/photo/34051908/) | Pexels License |
| `bouquet-15-roses` | Bouquet dense, roses serrées | [Pexels 34051913](https://www.pexels.com/photo/34051913/) | Pexels License |
| `bouquet-20-roses` | Grande composition, masse de roses | [Pexels 35400909](https://www.pexels.com/photo/35400909/) | Pexels License |

## Ce qui n'a PAS été touché

- `bouquet-7-roses`, `bouquet-9-roses`, `bouquet-12-roses` : **vraies photos de
  l'atelier**, déjà en place (`public/images/produits/`).
- `bouquet-roses` (fiche générique) : garde son visuel.

## Remplacer un visuel par une vraie photo

Un par un, sans toucher au reste :

1. Téléverser la vraie photo depuis le back-office (`/admin/produits` → la fiche
   → l'image), ou déposer le fichier en 800×800 WebP dans
   `public/images/produits/`.
2. Le badge « Photos non contractuelles » disparaît tout seul, dès que l'URL ne
   commence plus par `/images/placeholders/`.

Après le remplacement, retirer l'entrée correspondante dans `PRODUCT_IMAGES`
(`lib/product-images.ts`) pour que vider l'image en base ne fasse pas
réapparaître le visuel indicatif.

## Rejouer l'import

```bash
node scripts/import-rose-placeholders.mjs --dry-run   # n'écrit rien
node scripts/import-rose-placeholders.mjs
```

Additif et idempotent : aucun `delete`, aucune fiche créée ou supprimée, seuls
`imageUrl` et `imageUrls` des huit slugs listés sont écrits.
