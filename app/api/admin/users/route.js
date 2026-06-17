// app/api/admin/users/route.js
// GET → minden felhasználó listája, a projekt-tagságaikkal együtt
// POST → új felhasználó létrehozása (kód + PIN generálással), opcionálisan
//        egy projekthez rendelve (ProjectMember)
// (mindkettő csak ADMIN-nak)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hashPin } from "@/lib/password";
import { generateUserCode, generatePin } from "@/lib/codes";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Csak admin férhet hozzá." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    include: {
      memberships: { include: { project: { select: { code: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Csak admin férhet hozzá." }, { status: 403 });
  }

  const { name, role, phone, projectId, trade } = await request.json();

  if (!name?.trim() || !role) {
    return NextResponse.json({ ok: false, error: "A név és a szerepkör megadása kötelező." }, { status: 400 });
  }
  if (!["GC", "TRADE", "INVESTOR"].includes(role)) {
    return NextResponse.json({ ok: false, error: "Érvénytelen szerepkör." }, { status: 400 });
  }
  if (role === "TRADE" && !trade?.trim()) {
    return NextResponse.json({ ok: false, error: "Szakma megadása kötelező." }, { status: 400 });
  }

  const code = await generateUserCode(role, trade);
  const pin = generatePin();

  const user = await prisma.user.create({
    data: {
      code,
      pinHash: await hashPin(pin),
      role,
      name: name.trim(),
      phone: phone?.trim() || "",
      active: true,
    },
  });

  if (projectId) {
    await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId,
        role,
        trade: role === "TRADE" ? trade.trim() : null,
        active: true,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    user: { id: user.id, code: user.code, name: user.name, role: user.role },
    pin,
  });
}
