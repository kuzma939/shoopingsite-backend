const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connected to database!');
  // Проста перевірка: можна додати щось
  const products = await prisma.product.findMany();
  console.log('Products count:', products.length);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
