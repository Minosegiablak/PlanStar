// app/api/admin/users/[userId]/route.js
// PATCH → felhasználó ki-/bekapcsolása.
//   { active: false }                      → GLOBÁLIS kizárás (minden projektből)
//   { active: false, projectId: "..." }     → csak EGY projektből zárja ki
// (csak ADMIN-nak)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(request, { params }) {
  const { userId } = params;
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Csak admin férhet hozzá." }, { status: 403 });
  }

  const { active, projectId } = await request.json();
  if (typeof active !== "boolean") {
    return NextResponse.json({ ok: false, error: "Hiányzik az 'active' mező." }, { status: 400 });
  }

  if (projectId) {
    // Projektenkénti kizárás/visszaengedés
    const membership = await prisma.projectMember.findFirst({ where: { userId, projectId } });
    if (!membership) {
      return NextResponse.json({ ok: false, error: "Nincs ilyen projekt-tagság." }, { status: 404 });
    }
    await prisma.projectMember.update({ where: { id: membership.id }, data: { active } });
    return NextResponse.json({ ok: true, scope: "project" });
  }

  // Globális kizárás/visszaengedés — a user maga is letiltva,
  // ez a leggyorsabb "egy gombnyomásos" megoldás fizetési elmaradásnál.
  const user = await prisma.user.update({ where: { id: userId }, data: { active } });
  return NextResponse.json({ ok: true, scope: "global", user });
}
