// app/api/setup-admin/route.js
//
// EGYSZERI HASZNÁLATRA SZÁNT, IDEIGLENES végpont: létrehozza az első ADMIN
// felhasználót az adatbázisban, ha még nincs admin. Böngészőből, GET
// kéréssel hívható meg (csak nyisd meg az URL-t).
//
// FONTOS: ezt a fájlt törölni kell (vagy a repóból eltávolítani), miután
// egyszer lefuttattad — nem maradhat bent élesben, mert bárki meghívhatná.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/password";
import { generatePin } from "@/lib/codes";
export const dynamic = "force-dynamic";
export async function GET() {
  // Ha már van admin, nem csinálunk semmit — nem írjuk felül véletlenül.
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    return NextResponse.json({
      ok: false,
      message: "Már létezik admin felhasználó, nem hoztam létre újat.",
      code: existingAdmin.code,
    });
  }

  const pin = generatePin();
  const admin = await prisma.user.create({
    data: {
      code: "ADMIN-0001",
      pinHash: await hashPin(pin),
      role: "ADMIN",
      name: "Fő Admin",
      phone: "",
      active: true,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Admin felhasználó létrehozva. JEGYEZD FEL a kódot és a PIN-t — ez csak most jelenik meg!",
    code: admin.code,
    pin,
  });
}
