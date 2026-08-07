import bcrypt from "bcryptjs";

process.env.DATABASE_URL ??=
  "mongodb://localhost:27017/premium-boilerplate-menu";
// process.env.DATABASE_URL ??=
//   "mongodb://127.0.0.1:27017/premium-boilerplate-menu";

const { PrismaClient } = await import("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "Administrator", isDefault: true },
  });

  const existing = await prisma.user.findUnique({
    where: { email: "admin@premiummenu.test" },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@premiummenu.test",
        passwordHash: bcrypt.hashSync("admin1234", 10),
        roleId: role.id,
      },
    });
  }

  console.log("seeded");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
