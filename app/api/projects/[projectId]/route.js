// app/api/projects/[projectId]/route.js
// GET → egy projekt részletei: alapadatok, alaprajzok, és a JOGOSULTSÁG
// SZERINT SZŰRT hibajegyek. Ez az a pont, ahol a szerepkör-alapú
// adatizoláció szerveroldalon, a forrásnál érvényesül — a kliens
// fizikailag nem kapja meg azt, amihez nincs hozzáférése.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject, ticketWhereFor, canSeeNotes } from "@/lib/permissions";

export async function GET(request, { params }) {
  const { projectId } = params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (!canAccessProject(user, projectId)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a projekthez." }, { status: 403 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ ok: false, error: "A projekt nem található." }, { status: 404 });
  }

  const floorplans = await prisma.floorplan.findMany({ where: { projectId } });

  const ticketWhere = { projectId, ...ticketWhereFor(user) };
  const includeNotes = canSeeNotes(user);

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere,
    include: includeNotes ? { notes: { orderBy: { createdAt: "asc" } } } : undefined,
    orderBy: { createdAt: "asc" },
  });

  // A projekt aktív résztvevőinek neve + telefonszáma (csak ennyi — sem a
  // belépési kód, sem a PIN nem szerepel itt). Ez teszi lehetővé a
  // hívógombot a bejegyzéseknél, anélkül hogy admin jogosultság kellene.
  const memberships = await prisma.projectMember.findMany({
    where: { projectId, active: true },
    include: { user: { select: { name: true, phone: true } } },
  });
  const users = memberships.map((m) => ({ name: m.user.name, phone: m.user.phone }));

  return NextResponse.json({ ok: true, project, floorplans, tickets, users });
}
