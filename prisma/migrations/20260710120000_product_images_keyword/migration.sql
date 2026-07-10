-- Galerie produit (max 3) + mot-clé menu

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "keyword" TEXT;

UPDATE "Product"
SET "imageUrls" = ARRAY["imageUrl"]
WHERE "imageUrl" IS NOT NULL
  AND "imageUrl" <> ''
  AND cardinality("imageUrls") = 0;

UPDATE "Product"
SET "keyword" = CASE slug
  WHEN 'mango-passion' THEN 'Solaire'
  WHEN 'goyave-vanille' THEN 'Floral'
  WHEN 'caramel-baileys' THEN 'Signature'
  WHEN 'nutella-caramel' THEN 'Gourmand'
  WHEN 'caramel-cappuccino' THEN 'Intense'
  WHEN 'vanilla-caramel' THEN 'Classique'
  WHEN 'speculoos' THEN 'Croquant'
  WHEN 'foret-blanche' THEN 'Délicat'
  WHEN 'tiramisu' THEN 'Onctueux'
  WHEN 'mousse-chocolat' THEN 'Intense'
  ELSE "keyword"
END
WHERE "keyword" IS NULL;
