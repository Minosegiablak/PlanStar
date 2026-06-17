// app/api/projects/[projectId]/tickets/[ticketId]/route.js
// PATCH → hibajegy módosítása (pozíció húzáskor, státuszváltás)
// DELETE → hibajegy törlése

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject, canAccessTicket, canEditTickets } from "@/lib/permissions";

async function loadTicketOrFail(projectId, ticketId) {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, projectId } });
  return ticket;
}

export async function PATCH(request, { params }) {
  const { projectId, ticketId } = params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (!canAccessProject(user, projectId)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a projekthez." }, { status: 403 });
  }

  const ticket = await loadTicketOrFail(projectId, ticketId);
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "A hibajegy nem található." }, { status: 404 });
  }
  if (!canAccessTicket(user, ticket)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a hibajegyhez." }, { status: 403 });
  }
  if (!canEditTickets(user)) {
    return NextResponse.json({ ok: false, error: "Nincs jogosultságod a hibajegy módosítására." }, { status: 403 });
  }

  const body = await request.json();
  const data = {};

  // Pozíció (húzás) — csak ADMIN/GC mozgathatja (a démó-logikával egyezően)
  if (typeof body.x === "number" && typeof body.y === "number") {
    if (user.role !== "ADMIN" && user.projectRole !== "GC") {
      return NextResponse.json({ ok: false, error: "Csak admin vagy GC mozgathatja a pöttyöt." }, { status: 403 });
    }
    data.x = body.x;
    data.y = body.y;
  }

  // Státuszváltás — ADMIN, GC, és a tegelt TRADE is állíthatja a sajátján
  if (body.status) {
    const allowed = ["NYITOTT", "FOLYAMATBAN", "JAVITVA", "LEZARVA"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "Érvénytelen státusz." }, { status: 400 });
    }
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "Nincs mit frissíteni." }, { status: 400 });
  }

  const updated = await prisma.ticket.update({ where: { id: ticketId }, data });
  return NextResponse.json({ ok: true, ticket: updated });
}

export async function DELETE(request, { params }) {
  const { projectId, ticketId } = params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (!canAccessProject(user, projectId)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a projekthez." }, { status: 403 });
  }
  // Törlés csak ADMIN vagy GC — szándékosan szigorúbb, mint a szerkesztés.
  if (user.role !== "ADMIN" && user.projectRole !== "GC") {
    return NextResponse.json({ ok: false, error: "Csak admin vagy GC törölhet hibajegyet." }, { status: 403 });
  }

  const ticket = await loadTicketOrFail(projectId, ticketId);
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "A hibajegy nem található." }, { status: 404 });
  }

  await prisma.ticket.delete({ where: { id: ticketId } });
  return NextResponse.json({ ok: true });
}
