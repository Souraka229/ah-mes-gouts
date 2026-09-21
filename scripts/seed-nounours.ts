import { getProductImageUrl } from "@/lib/product-images";
import { getPrisma } from "@/lib/prisma";

async function seedNounoursToRealDatabase() {
  const prisma = getPrisma();

  const nounoursData = [
    {
      id: "nounours-stitch",
      slug: "nounours-stitch",
      name: "Nounours Stitch",
      description: "Peluche douce et colorée — visuel indicatif temporaire. Disponible en plusieurs tailles.",
      price: 10000,
      imageUrl: getProductImageUrl("nounours-stitch"),
      imageUrls: [getProductImageUrl("nounours-stitch")],
      keyword: "Aventure",
      stockRemaining: 25,
      stockMinimum: 5,
      isNew: true,
      isPromotion: false,
      promotionPrice: null,
      isMenuDuJour: false,
      isPopular: true,
      isGiftCard: false,
      giftCardMessage: null,
      category: "Nounours",
    },
    {
      id: "nounours-teddy",
      slug: "nounours-teddy",
      name: "Nounours Teddy",
      description: "Le classique intemporel — visuel indicatif temporaire. Disponible en plusieurs tailles.",
      price: 10000,
      imageUrl: getProductImageUrl("nounours-teddy"),
      imageUrls: [getProductImageUrl("nounours-teddy")],
      keyword: "Classique",
      stockRemaining: 25,
      stockMinimum: 5,
      isNew: true,
      isPromotion: false,
      promotionPrice: null,
      isMenuDuJour: false,
      isPopular: true,
      isGiftCard: false,
      giftCardMessage: null,
      category: "Nounours",
    },
    {
      id: "nounours-labubu",
      slug: "nounours-labubu",
      name: "Nounours Labubu",
      description: "Personnage attachant et unique — visuel indicatif temporaire. Disponible en plusieurs tailles.",
      price: 10000,
      imageUrl: getProductImageUrl("nounours-labubu"),
      imageUrls: [getProductImageUrl("nounours-labubu")],
      keyword: "Original",
      stockRemaining: 25,
      stockMinimum: 5,
      isNew: true,
      isPromotion: false,
      promotionPrice: null,
      isMenuDuJour: false,
      isPopular: true,
      isGiftCard: false,
      giftCardMessage: null,
      category: "Nounours",
    },
  ];

  for (const data of nounoursData) {
    try {
      await prisma.product.upsert({
        where: { slug: data.slug },
        update: {
          name: data.name,
          description: data.description,
          price: data.price,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls,
          keyword: data.keyword,
          stockRemaining: data.stockRemaining,
          stockMinimum: data.stockMinimum,
          isNew: data.isNew,
          isPromotion: data.isPromotion,
          promotionPrice: data.promotionPrice,
          isMenuDuJour: data.isMenuDuJour,
          isPopular: data.isPopular,
          isGiftCard: data.isGiftCard,
          giftCardMessage: data.giftCardMessage,
          category: data.category,
          updatedAt: new Date(),
        },
        create: {
          id: data.id,
          slug: data.slug,
          name: data.name,
          description: data.description,
          price: data.price,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls,
          keyword: data.keyword,
          stockRemaining: data.stockRemaining,
          stockMinimum: data.stockMinimum,
          isNew: data.isNew,
          isPromotion: data.isPromotion,
          promotionPrice: data.promotionPrice,
          isMenuDuJour: data.isMenuDuJour,
          isPopular: data.isPopular,
          isGiftCard: data.isGiftCard,
          giftCardMessage: data.giftCardMessage,
          category: data.category,
        },
      });
      console.log(`✅ Produit créé/mis à jour : ${data.slug}`);
    } catch (err) {
      console.error(`❌ Erreur pour ${data.slug} :`, err);
    }
  }
}

seedNounoursToRealDatabase().catch((e) => {
  console.error("Erreur script seed :", e);
  process.exit(1);
});
