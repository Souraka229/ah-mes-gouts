-- Options & compléments configurables.
--
-- MIGRATION ADDITIVE UNIQUEMENT :
--   * aucune table supprimée, aucune colonne supprimée ;
--   * aucune donnée réécrite, aucun prix touché ;
--   * tout est posé en IF NOT EXISTS / garde d'exception pour pouvoir être
--     rejoué sans échouer.
--
-- À ne pas confondre avec « ProductVariant » (déjà en base) :
--   * une VARIANTE est une déclinaison du produit (taille, format) ; son prix
--     REMPLACE le prix de base, et le client en choisit toujours une ;
--   * une OPTION est un complément ; son prix S'AJOUTE au prix de base.
-- Les deux systèmes coexistent volontairement : ils ne facturent pas la même
-- chose. Voir le commentaire de « OptionGroup » dans prisma/schema.prisma.

-- ─── 1. Groupes d'options ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "OptionGroup" (
  "id"            TEXT         NOT NULL,
  "slug"          TEXT         NOT NULL,
  "name"          TEXT         NOT NULL,
  "description"   TEXT         NOT NULL DEFAULT '',
  -- 'single' (radio) | 'multiple' (cases à cocher)
  "selectionType" TEXT         NOT NULL DEFAULT 'single',
  "minSelections" INTEGER      NOT NULL DEFAULT 0,
  "maxSelections" INTEGER      NOT NULL DEFAULT 1,
  "isRequired"    BOOLEAN      NOT NULL DEFAULT false,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "sortOrder"     INTEGER      NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OptionGroup_slug_key"
  ON "OptionGroup"("slug");

CREATE INDEX IF NOT EXISTS "OptionGroup_isActive_sortOrder_idx"
  ON "OptionGroup"("isActive", "sortOrder");

-- ─── 2. Options ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Option" (
  "id"          TEXT         NOT NULL,
  "groupId"     TEXT         NOT NULL,
  "slug"        TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "description" TEXT         NOT NULL DEFAULT '',
  -- FCFA, entier. Source de vérité unique : le client n'envoie jamais de prix.
  "price"       INTEGER      NOT NULL,
  -- 'fixed' (dû une fois) | 'per_unit' (dû par unité choisie)
  "pricingType" TEXT         NOT NULL DEFAULT 'fixed',
  "unitLabel"   TEXT,
  -- Sous-famille d'affichage : « Vin / Spiritueux » se range en
  -- « Champagne sans alcool » / « Champagne avec alcool » sans multiplier les
  -- groupes.
  "subgroupLabel" TEXT,
  "imageUrl"    TEXT,
  "isActive"    BOOLEAN      NOT NULL DEFAULT true,
  "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
  "stockRemaining" INTEGER,
  "maxQuantity" INTEGER      NOT NULL DEFAULT 1,
  -- Personnalisation : 'none' | 'optional' | 'required'
  "messageMode"        TEXT    NOT NULL DEFAULT 'none',
  "messageMinLength"   INTEGER,
  "messageMaxLength"   INTEGER,
  "messagePlaceholder" TEXT,
  -- 'none' | 'optional' | 'required'
  "occasionMode"        TEXT    NOT NULL DEFAULT 'none',
  "allowCustomOccasion" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Option_groupId_slug_key"
  ON "Option"("groupId", "slug");

CREATE INDEX IF NOT EXISTS "Option_groupId_isActive_sortOrder_idx"
  ON "Option"("groupId", "isActive", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "Option"
    ADD CONSTRAINT "Option_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Rattachement produit ↔ groupe (avec surcharges par produit) ────────
-- Un groupe défini une fois, rattaché à N produits. Les bornes peuvent être
-- surchargées produit par produit : dix toppers sur un entremets, un seul
-- ailleurs, sans dupliquer le groupe.
CREATE TABLE IF NOT EXISTS "ProductOptionGroup" (
  "id"            TEXT         NOT NULL,
  "productId"     TEXT         NOT NULL,
  "groupId"       TEXT         NOT NULL,
  "minSelections" INTEGER,
  "maxSelections" INTEGER,
  "sortOrder"     INTEGER      NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductOptionGroup_productId_groupId_key"
  ON "ProductOptionGroup"("productId", "groupId");

CREATE INDEX IF NOT EXISTS "ProductOptionGroup_productId_sortOrder_idx"
  ON "ProductOptionGroup"("productId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "ProductOptionGroup"
    ADD CONSTRAINT "ProductOptionGroup_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductOptionGroup"
    ADD CONSTRAINT "ProductOptionGroup_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Catégories de messages ─────────────────────────────────────────────
-- Système DISTINCT des catégories de produits (« Product.category ») : celles-ci
-- qualifient l'occasion d'un message, elles ne classent pas le catalogue.
CREATE TABLE IF NOT EXISTS "MessageCategory" (
  "id"               TEXT         NOT NULL,
  "slug"             TEXT         NOT NULL,
  "name"             TEXT         NOT NULL,
  "allowsCustomText" BOOLEAN      NOT NULL DEFAULT false,
  "isActive"         BOOLEAN      NOT NULL DEFAULT true,
  "sortOrder"        INTEGER      NOT NULL DEFAULT 0,
  -- Catégorie parente (un seul niveau) : « Fête spéciale » → Noël, Saint-Valentin…
  "parentId"         TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageCategory_slug_key"
  ON "MessageCategory"("slug");

CREATE INDEX IF NOT EXISTS "MessageCategory_isActive_sortOrder_idx"
  ON "MessageCategory"("isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "MessageCategory_parentId_sortOrder_idx"
  ON "MessageCategory"("parentId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "MessageCategory"
    ADD CONSTRAINT "MessageCategory_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "MessageCategory"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 5. Snapshot des options sur la ligne de commande ──────────────────────
-- « optionId » est conservé SANS clé étrangère, exactement comme
-- « OrderItem.variantId » : désactiver ou supprimer une option ne doit jamais
-- pouvoir casser une commande passée. Le libellé et le prix sont figés ici.
CREATE TABLE IF NOT EXISTS "OrderItemOption" (
  "id"                TEXT         NOT NULL,
  "orderItemId"       TEXT         NOT NULL,
  "optionId"          TEXT,
  "groupNameSnapshot" TEXT         NOT NULL,
  "optionNameSnapshot" TEXT        NOT NULL,
  "pricingType"       TEXT         NOT NULL DEFAULT 'fixed',
  "unitPriceSnapshot" INTEGER      NOT NULL,
  "quantity"          INTEGER      NOT NULL DEFAULT 1,
  "totalPrice"        INTEGER      NOT NULL,
  "customMessage"     TEXT,
  "messageCategorySnapshot" TEXT,
  "customOccasion"    TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItemOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderItemOption_orderItemId_idx"
  ON "OrderItemOption"("orderItemId");

DO $$ BEGIN
  ALTER TABLE "OrderItemOption"
    ADD CONSTRAINT "OrderItemOption_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. RLS — protéger les prix et les brouillons ──────────────────────────
-- Le site lit le catalogue via Prisma (rôle serveur, hors RLS). Ces policies ne
-- concernent que la surface anonyme (PostgREST).
ALTER TABLE "OptionGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Option"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageCategory" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "option_group_public_read" ON "OptionGroup";
CREATE POLICY "option_group_public_read" ON "OptionGroup"
  FOR SELECT USING ("isActive" = true);

DROP POLICY IF EXISTS "option_public_read" ON "Option";
CREATE POLICY "option_public_read" ON "Option"
  FOR SELECT USING (
    "isActive" = true
    AND EXISTS (
      SELECT 1 FROM "OptionGroup" g
      WHERE g."id" = "Option"."groupId"
        AND g."isActive" = true
    )
  );

DROP POLICY IF EXISTS "message_category_public_read" ON "MessageCategory";
CREATE POLICY "message_category_public_read" ON "MessageCategory"
  FOR SELECT USING ("isActive" = true);

-- Aucune policy INSERT / UPDATE / DELETE sur ces tables : le rôle anon ne peut
-- donc toujours pas écrire un prix. Même garantie que sur "Product" et
-- "ProductVariant".

-- "ProductOptionGroup" et "OrderItemOption" restent SANS RLS activée : elles ne
-- sont lues que par le back-office (rôle serveur) et ne portent aucun prix
-- public — les activer fermerait l'accès au back-office sans rien protéger de
-- plus.
