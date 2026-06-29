import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.activationCode.upsert({
    where: { code: "DEMO-2026" },
    update: {},
    create: {
      code: "DEMO-2026",
      customerName: "عميل تجريبي",
      totalUses: 20,
      remainingUses: 20,
      isActive: true
    }
  });

  console.log("Seed completed. Admin login uses ADMIN_EMAIL and ADMIN_PASSWORD_HASH from ENV.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
