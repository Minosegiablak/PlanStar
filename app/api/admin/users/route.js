// app/api/admin/users/route.js
// GET → minden felhasználó listája, a projekt-tagságaikkal együtt
// (csak ADMIN-nak)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
