const { PrismaClient } = require('@prisma/client');
const products = require('../src/data/products'); // адаптуй шлях, якщо потрібно

const prisma = new PrismaClient();

async function main() {
  for (const raw of products) {
    const product = {
      ...raw,
      images: Array.isArray(raw.images)
        ? raw.images.filter(img => typeof img === 'string')
        : [],
      sizes: Array.isArray(raw.sizes) ? raw.sizes : [],
      isTop: raw.isTop ?? false,
      isSpecialOffer: raw.isSpecialOffer ?? false, // ✅ нове поле
    };

    try {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          price: product.price,
          isTop: product.isTop,
          isSpecialOffer: product.isSpecialOffer, // ✅
          sku: product.sku,
          size: product.size,
          category: product.category,
          image: product.image,
          images: product.images,
          sizes: product.sizes,
        },
        create: {
          id: product.id,
          price: product.price,
          isTop: product.isTop,
          isSpecialOffer: product.isSpecialOffer, // ✅
          sku: product.sku,
          size: product.size,
          category: product.category,
          image: product.image,
          images: product.images,
          sizes: product.sizes,
        },
      });

      console.log(`✅ Product ${product.id} seeded`);
    } catch (error) {
      console.error(`❌ Error seeding product ${product.id}:`, error.message);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
