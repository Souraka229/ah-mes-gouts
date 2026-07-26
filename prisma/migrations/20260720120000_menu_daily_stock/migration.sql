-- Stock du jour par menu : quantité cible par produit, rechargée à l'activation (20h).
ALTER TABLE "Menu" ADD COLUMN "dailyStock" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
