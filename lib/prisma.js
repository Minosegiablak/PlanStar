// lib/prisma.js
// Egyetlen, megosztott Prisma-kliens. Next.js fejlesztői módban a fájlok
// gyakran újratöltődnek — singleton nélkül ez sok adatbázis-kapcsolatot
// nyitna feleslegesen. Ez a szokásos, ajánlott megoldás.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
