const { PrismaClient } = require('@prisma/client');
const products = require('../src/data/products'); // адаптуй до свого шляху

const prisma = new PrismaClient();

async function main() {
  for (const raw of products) {
    const product = {
      ...raw,
      images: raw.images?.filter(img => typeof img === 'string') || [],
      sizes: raw.sizes || [],
    };

    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        price: product.price,
        isTop: product.isTop,
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
        sku: product.sku,
        size: product.size,
        category: product.category,
        image: product.image,
        images: product.images,
        sizes: product.sizes,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
