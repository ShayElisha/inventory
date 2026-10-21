import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** מנקה את כל הנתונים — ללא נתוני דוגמה */
async function main() {
  await prisma.stockTransaction.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouseLocation.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();
  console.log("Database cleared — no seed data");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
