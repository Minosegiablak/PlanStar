// prisma/seed.js
// Kezdő (démó) adatok feltöltése az adatbázisba. Ezzel a paranccsal futtatod:
//   npm run db:seed
//
// A PIN-eket itt is TITKOSÍTVA mentjük el — soha nem nyersen.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seed indul...");

  // ── Admin ──────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { code: "ADMIN-0001" },
    update: {},
    create: {
      code: "ADMIN-0001",
      pinHash: await bcrypt.hash("1234", 10),
      role: "ADMIN",
      name: "Fő Admin",
      phone: "+36 70 000 0000",
      active: true,
    },
  });

  // ── Projekt ────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { code: "2026/0001" },
    update: {},
    create: {
      code: "2026/0001",
      name: "Fiskális úti lakóház (Székesfehérvár)",
      gcName: "Kovács Bau Kft.",
      status: "Aktív",
      paid: true,
    },
  });

  // ── GC ─────────────────────────────────────────────────
  const gc = await prisma.user.upsert({
    where: { code: "GC-2026-7781" },
    update: {},
    create: {
      code: "GC-2026-7781",
      pinHash: await bcrypt.hash("1111", 10),
      role: "GC",
      name: "Kovács Bau Kft.",
      phone: "+36 30 111 2233",
      active: true,
    },
  });
  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: gc.id, projectId: project.id } },
    update: {},
    create: { userId: gc.id, projectId: project.id, role: "GC", active: true },
  });

  // ── Szakmák ────────────────────────────────────────────
  const vill = await prisma.user.upsert({
    where: { code: "SZ-VILL-3320" },
    update: {},
    create: {
      code: "SZ-VILL-3320",
      pinHash: await bcrypt.hash("2222", 10),
      role: "TRADE",
      name: "Villám Elektro",
      phone: "+36 30 444 5566",
      active: true,
    },
  });
  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: vill.id, projectId: project.id } },
    update: {},
    create: { userId: vill.id, projectId: project.id, role: "TRADE", trade: "Villanyszerelő", active: true },
  });

  const nyil = await prisma.user.upsert({
    where: { code: "SZ-NYIL-5510" },
    update: {},
    create: {
      code: "SZ-NYIL-5510",
      pinHash: await bcrypt.hash("3333", 10),
      role: "TRADE",
      name: "Ablak Profi",
      phone: "+36 30 777 8899",
      active: true,
    },
  });
  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: nyil.id, projectId: project.id } },
    update: {},
    create: { userId: nyil.id, projectId: project.id, role: "TRADE", trade: "Nyílászárós", active: true },
  });

  // ── Beruházó ───────────────────────────────────────────
  const investor = await prisma.user.upsert({
    where: { code: "BER-2026-9001" },
    update: {},
    create: {
      code: "BER-2026-9001",
      pinHash: await bcrypt.hash("4444", 10),
      role: "INVESTOR",
      name: "Nagy Beruházó Zrt.",
      phone: "+36 1 234 5678",
      active: true,
    },
  });
  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: investor.id, projectId: project.id } },
    update: {},
    create: { userId: investor.id, projectId: project.id, role: "INVESTOR", active: true },
  });

  // ── Alaprajz (a kép URL-jét később, a Vercel Blob feltöltés után írjuk be) ──
  const floorplan = await prisma.floorplan.upsert({
    where: { id: "seed-floorplan-foldszint" },
    update: {},
    create: {
      id: "seed-floorplan-foldszint",
      projectId: project.id,
      name: "Földszint",
      imageUrl: "PLACEHOLDER_TOLTSD_FEL_A_VERCEL_BLOBRA",
      width: 1600,
      height: 1131,
    },
  });

  // ── Hibajegyek (pöttyök) ──────────────────────────────
  const ticketsData = [
    { title: "Hiányzó dugalj — bal szoba (lam. parketta)", room: "B lakás · szoba", x: 19.5, y: 41, trade: "Villanyszerelő", status: "NYITOTT", isPrivate: false },
    { title: "Terasz ajtó nem zár — bal nappali", room: "B lakás · nappali", x: 18.5, y: 60, trade: "Nyílászárós", status: "FOLYAMATBAN", isPrivate: false },
    { title: "BELSŐ: redőnyszekrény kábelezés egyeztetés GC-vel", room: "B lakás · fürdő", x: 27, y: 33, trade: "Villanyszerelő", status: "NYITOTT", isPrivate: true },
    { title: "Bukó-nyíló vasalat csere — konyha ablak", room: "A lakás · konyha", x: 55, y: 31, trade: "Nyílászárós", status: "NYITOTT", isPrivate: false },
    { title: "Konnektorsor a nappaliban hiányos", room: "A lakás · nappali-étkező", x: 58, y: 56, trade: "Villanyszerelő", status: "NYITOTT", isPrivate: false },
    { title: "Jobb szoba ablak — sérült üveg", room: "A lakás · szoba", x: 70, y: 40, trade: "Nyílászárós", status: "FOLYAMATBAN", isPrivate: false },
  ];

  for (const t of ticketsData) {
    const existing = await prisma.ticket.findFirst({ where: { projectId: project.id, title: t.title } });
    if (!existing) {
      await prisma.ticket.create({
        data: { ...t, projectId: project.id, floorplanId: floorplan.id, createdById: gc.id },
      });
    }
  }

  console.log("Seed kész.");
  console.log("Belépési kódok: ADMIN-0001/1234, GC-2026-7781/1111, SZ-VILL-3320/2222, SZ-NYIL-5510/3333, BER-2026-9001/4444");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
