// prisma.config.ts
// Prisma 7.x configuration file
// Docs: https://www.prisma.io/docs/orm/prisma-config/overview

import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
