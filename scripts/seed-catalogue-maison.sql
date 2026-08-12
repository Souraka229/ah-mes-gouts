-- Catalogue maison — genere par scripts/seed-catalogue-maison.mjs
-- Idempotent : relançable sans creer de doublon.
begin;

-- 1. Noms abimes par un double encodage UTF-8
update "Product" set name = 'Forêt Blanche' where name = 'ForÃªt Blanche';
update "Product" set name = 'Forêt Noire' where name = 'ForÃªt Noire';
update "Product" set name = 'La Corbeille à Fruits' where name = 'La Corbeille Ã  Fruits';
update "Product" set name = 'Le Café' where name = 'Le CafÃ©';

-- 2. Produits de test laisses en base
delete from "Product" where slug in ('test', 'test-2', 'restafy');

-- 3. Catalogue maison (upsert par slug)
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-chocolat-vanille', 'commande-chocolat-vanille', 'Chocolat Vanille', 'Grand entremets chocolat vanille, monté à la commande. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3000, 'Sur commande', '/images/produits/foret-noire.webp', 'À la part', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-chocolat-cappuccino', 'commande-chocolat-cappuccino', 'Chocolat Cappuccino', 'Grand entremets chocolat cappuccino, monté à la commande. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3000, 'Sur commande', '/images/produits/foret-noire.webp', 'À la part', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-chocolat-baileys', 'commande-chocolat-baileys', 'Chocolat Baileys', 'Grand entremets chocolat baileys, monté à la commande. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3000, 'Sur commande', '/images/produits/foret-noire.webp', 'À la part', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-chocolat-menthe', 'commande-chocolat-menthe', 'Chocolat Menthe', 'Grand entremets chocolat menthe, monté à la commande. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3000, 'Sur commande', '/images/produits/foret-noire.webp', 'À la part', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-chocolat-framboise', 'commande-chocolat-framboise', 'Chocolat Framboise', 'Grand entremets chocolat framboise, monté à la commande. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3000, 'Sur commande', '/images/produits/foret-noire.webp', 'À la part', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-mangue-vanille', 'commande-mangue-vanille', 'Mangue Vanille', 'Grand entremets mangue vanille, monté à la commande. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3000, 'Sur commande', '/images/produits/foret-noire.webp', 'À la part', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-framboise-vanille', 'commande-framboise-vanille', 'Framboise Vanille', 'Grand entremets framboise vanille, monté à la commande. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3000, 'Sur commande', '/images/produits/foret-noire.webp', 'À la part', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-vanille-cappuccino', 'commande-vanille-cappuccino', 'Vanille Cappuccino', 'Grand entremets vanille cappuccino, monté à la commande. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3000, 'Sur commande', '/images/produits/foret-noire.webp', 'À la part', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-tropicana', 'commande-tropicana', 'Tropicana', 'Mousse vanille mascarpone, insert bissap et ananas. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande. À commander au moins 72 h à l''avance.', 3500, 'Sur commande', '/images/produits/foret-noire.webp', 'Signature', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-afrodisiak', 'commande-afrodisiak', 'Afrodisiak', 'Mousse chocolat, crémeux gingembre. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande. À commander au moins 72 h à l''avance.', 3500, 'Sur commande', '/images/produits/foret-noire.webp', 'Signature', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-banoffee', 'commande-banoffee', 'Banoffee', 'Mousse chocolat, crémeux beurre d''arachide, banane flambée et caramélisée. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande. À commander au moins 72 h à l''avance.', 3500, 'Sur commande', '/images/produits/foret-noire.webp', 'Signature', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-mojito', 'commande-mojito', 'Mojito', 'Mousse vanille, insert menthe-citron. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3500, 'Sur commande', '/images/produits/foret-noire.webp', 'Signature', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-tiramisu', 'commande-tiramisu', 'Tiramisu', 'Mousse tiramisu, insert crémeux cappuccino. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3500, 'Sur commande', '/images/produits/tiramisu-caramel.webp', 'Signature', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-foret-noire', 'commande-foret-noire', 'Forêt-Noire', 'Mousse chocolat et vanille, insert compotée de cerise. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3500, 'Sur commande', '/images/produits/foret-noire.webp', 'Signature', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('commande-vanille-myrtille', 'commande-vanille-myrtille', 'Vanille Myrtille', 'Mousse vanille mascarpone, insert gelée de myrtille. Vendu à la part, à partir de 6, 10 ou 12 parts selon la recette — confirmez le nombre de parts à la commande.', 3500, 'Sur commande', '/images/produits/foret-noire.webp', 'Signature', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-20cm', 'nounours-20cm', 'Nounours 20 cm', 'Nounours en peluche, 20 cm.', 10000, 'Nounours', '/images/produits/nounours-beige.webp', '20 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-25cm', 'nounours-25cm', 'Nounours 25 cm', 'Nounours en peluche, 25 cm.', 15000, 'Nounours', '/images/produits/nounours-beige.webp', '25 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-30cm', 'nounours-30cm', 'Nounours 30 cm', 'Nounours en peluche, 30 cm.', 25000, 'Nounours', '/images/produits/nounours-beige.webp', '30 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-80cm', 'nounours-80cm', 'Nounours 80 cm', 'Nounours en peluche, 80 cm.', 35000, 'Nounours', '/images/produits/nounours-beige.webp', '80 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-90cm', 'nounours-90cm', 'Nounours 90 cm', 'Nounours en peluche, 90 cm.', 40000, 'Nounours', '/images/produits/nounours-beige.webp', '90 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-100cm', 'nounours-100cm', 'Nounours 100 cm', 'Nounours en peluche, 100 cm.', 45000, 'Nounours', '/images/produits/nounours-beige.webp', '100 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-120cm', 'nounours-120cm', 'Nounours 120 cm', 'Nounours en peluche, 120 cm.', 50000, 'Nounours', '/images/produits/nounours-beige.webp', '120 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-130cm', 'nounours-130cm', 'Nounours 130 cm', 'Nounours en peluche, 130 cm.', 70000, 'Nounours', '/images/produits/nounours-beige.webp', '130 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('nounours-140cm', 'nounours-140cm', 'Nounours 140 cm', 'Nounours en peluche, 140 cm.', 90000, 'Nounours', '/images/produits/nounours-beige.webp', '140 cm', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('rose-unite', 'rose-unite', 'Rose à l''unité', 'Une rose fraîche, sans emballage.', 3500, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-1-rose', 'bouquet-1-rose', 'Bouquet 1 rose', 'Une rose parfumée, gypsophile et emballage.', 5000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-2-roses', 'bouquet-2-roses', 'Bouquet 2 roses', 'Deux roses parfumées et gypsophile.', 10000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-3-roses', 'bouquet-3-roses', 'Bouquet 3 roses', 'Trois roses parfumées, gypsophile et carte.', 12000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-5-roses', 'bouquet-5-roses', 'Bouquet 5 roses', '5 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.', 20000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-7-roses', 'bouquet-7-roses', 'Bouquet 7 roses', '7 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.', 25000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-9-roses', 'bouquet-9-roses', 'Bouquet 9 roses', '9 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.', 33000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-10-roses', 'bouquet-10-roses', 'Bouquet 10 roses', '10 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.', 35000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-12-roses', 'bouquet-12-roses', 'Bouquet 12 roses', '12 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.', 42000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-15-roses', 'bouquet-15-roses', 'Bouquet 15 roses', '15 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.', 50000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('bouquet-20-roses', 'bouquet-20-roses', 'Bouquet 20 roses', '20 roses parfumées, gypsophile, carte et emballage. Sacoche offerte.', 70000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Roses fraîches', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();
insert into "Product" (id, slug, name, description, price, category, "imageUrl", keyword, "stockRemaining", "stockMinimum", "createdAt", "updatedAt")
values ('supplement-chocolats', 'supplement-chocolats', 'Supplément chocolats', 'À ajouter à un bouquet. De quelques chocolats (3 000 F) au paquet complet (10 000 F) — précisez la quantité souhaitée en commentaire.', 3000, 'Fleurs', '/images/produits/bouquet-roses.webp', 'Duo', 9999, 0, now(), now())
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, "imageUrl" = excluded."imageUrl",
  keyword = excluded.keyword, "stockRemaining" = 9999, "stockMinimum" = 0,
  "updatedAt" = now();

commit;