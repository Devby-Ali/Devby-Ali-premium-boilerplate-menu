import bcrypt from "bcryptjs";

import { getPrismaClient } from "../src/server/prisma";
import { env } from "../src/lib/env";

async function main() {
  const prisma = getPrismaClient();

  const role = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      description: "Administrator",
      isDefault: true,
    },
  });

  const passwordHash = await bcrypt.hash(env.ADMIN_INITIAL_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: env.ADMIN_INITIAL_EMAIL },
    update: {
      name: "Administrator",
      passwordHash,
      roleId: role.id,
      isActive: true,
    },
    create: {
      name: "Administrator",
      email: env.ADMIN_INITIAL_EMAIL,
      passwordHash,
      roleId: role.id,
      isActive: true,
    },
  });

  const existingSetting = await prisma.setting.findFirst();

  if (existingSetting) {
    await prisma.setting.update({
      where: { id: existingSetting.id },
      data: {
        siteName: "Premium Menu",
        contactEmail: "hello@premiummenu.test",
        address: "تهران، خیابان ...",
        primaryColor: "#2f6b4f",
        secondaryColor: "#8b233d",
        accentColor: "#f4e3b2",
        themeMode: "system",
      },
    });
  } else {
    await prisma.setting.create({
      data: {
        siteName: "Premium Menu",
        contactEmail: "hello@premiummenu.test",
        address: "تهران، خیابان ...",
        primaryColor: "#2f6b4f",
        secondaryColor: "#8b233d",
        accentColor: "#f4e3b2",
        themeMode: "system",
      },
    });
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await Promise.resolve();
  });
