// lib/codes.js
// Belépési kódok és PIN-ek generálása, valamint a projekt-kódok
// (pl. "2026/0001") automatikus növelése.

import { prisma } from "./prisma";

const TRADE_PREFIX = {
  "Villanyszerelő": "VILL",
  "Nyílászárós": "NYIL",
  "Vízvezeték-szerelő": "VIZ",
  "Festő": "FEST",
  "Burkoló": "BURK",
  "Gipszkartonos": "GIPSZ",
  "Asztalos": "ASZT",
};

function tradePrefix(trade) {
  return TRADE_PREFIX[trade] || "SZ";
}

// Egyedi belépési kód egy szakmának, pl. "SZ-VILL-4827".
// Ellenőrzi az adatbázisban, hogy a kód még nem foglalt.
export async function generateTradeCode(trade) {
  let code;
  let exists = true;
  while (exists) {
    const n = Math.floor(1000 + Math.random() * 9000);
    code = `SZ-${tradePrefix(trade)}-${n}`;
    exists = await prisma.user.findUnique({ where: { code } });
  }
  return code;
}

// Egyedi belépési kód a szerepkör alapján — GC, INVESTOR vagy TRADE esetén.
// GC → "GC-2026-4827", INVESTOR → "BER-2026-4827", TRADE → generateTradeCode().
export async function generateUserCode(role, trade) {
  if (role === "TRADE") return generateTradeCode(trade);

  const prefix = role === "GC" ? "GC" : "BER";
  const year = new Date().getFullYear();
  let code;
  let exists = true;
  while (exists) {
    const n = Math.floor(1000 + Math.random() * 9000);
    code = `${prefix}-${year}-${n}`;
    exists = await prisma.user.findUnique({ where: { code } });
  }
  return code;
}

// 4 jegyű PIN generálása.
export function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// A következő projekt-kód kiszámítása (pl. "2026/0001" → "2026/0002").
// Minden évben újra 0001-től kezdődik.
export async function getNextProjectCode() {
  const year = new Date().getFullYear();
  const projects = await prisma.project.findMany({
    where: { code: { startsWith: `${year}/` } },
    select: { code: true },
  });
  const nums = projects.map((p) => parseInt(p.code.split("/")[1], 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${year}/${String(next).padStart(4, "0")}`;
}
