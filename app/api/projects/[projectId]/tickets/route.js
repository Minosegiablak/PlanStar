// app/api/projects/[projectId]/tickets/route.js
// GET  → a jogosultság szerint szűrt hibajegyek listája
// POST → új hibajegy (pötty) lehelyezése — ADMIN, GC, és TRADE is (a
//        szakma is jelezhet hibát, amit jelez a démóban a "takarítás
//        kérése" funkció is)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject, ticketWhereFor, canEditTickets } from "@/lib/permissions";

export async function GET(request, { params }) {
  const { projectId } = params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (!canAccessProject(user, projectId)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a projekthez." }, { status: 403 });
  }

  const tickets = await prisma.ticket.findMany({
    where: { projectId, ...ticketWhereFor(user) },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ ok: true, tickets });
}

export async function POST(request, { params }) {
  const { projectId } = params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (!canAccessProject(user, projectId)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a projekthez." }, { status: 403 });
  }
  if (!canEditTickets(user)) {
    return NextResponse.json({ ok: false, error: "Nincs jogosultságod hibajegyet létrehozni." }, { status: 403 });
  }

  const body = await request.json();
  const { title, room, x, y, trade, isPrivate, cleaningFor, floorplanId } = body || {};

  if (!title?.trim() || typeof x !== "number" || typeof y !== "number" || !trade?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Hiányzó mezők: cím, pozíció (x, y) és szakma kötelező." },
      { status: 400 }
    );
  }

  // TRADE szerepkörben csak a saját szakmájához tegelhet hibajegyet.
  if (user.projectRole === "TRADE" && trade.trim() !== user.trade) {
    return NextResponse.json(
      { ok: false, error: "Csak a saját szakmádhoz tegelt hibajegyet hozhatsz létre." },
      { status: 403 }
    );
  }

  const ticket = await prisma.ticket.create({
    data: {
      projectId,
      floorplanId: floorplanId || null,
      title: title.trim(),
      room: room?.trim() || null,
      x,
      y,
      trade: trade.trim(),
      isPrivate: !!isPrivate,
      cleaningFor: Array.isArray(cleaningFor) ? cleaningFor : [],
      createdById: user.id,
    },
  });

  return NextResponse.json({ ok: true, ticket });
}
