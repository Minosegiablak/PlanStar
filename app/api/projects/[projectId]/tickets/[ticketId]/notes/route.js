// app/api/projects/[projectId]/tickets/[ticketId]/notes/route.js
// POST → új bejegyzés (szöveg és/vagy fotó) egy hibajegyhez.
// A fotó feltöltése külön történik (Vercel Blob) — ide már a kész
// imageUrl érkezik.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject, canAccessTicket, canSeeNotes } from "@/lib/permissions";

export async function POST(request, { params }) {
  const { projectId, ticketId } = params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (!canAccessProject(user, projectId)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a projekthez." }, { status: 403 });
  }

  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, projectId } });
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "A hibajegy nem található." }, { status: 404 });
  }
  if (!canAccessTicket(user, ticket) || !canSeeNotes(user)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a hibajegyhez." }, { status: 403 });
  }

  const { text, imageUrl } = await request.json();
  if (!text?.trim() && !imageUrl) {
    return NextResponse.json({ ok: false, error: "A bejegyzéshez szöveg vagy kép szükséges." }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      ticketId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      text: text?.trim() || null,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json({ ok: true, note });
}
