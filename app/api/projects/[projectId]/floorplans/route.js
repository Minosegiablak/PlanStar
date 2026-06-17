// app/api/projects/[projectId]/floorplans/route.js
// GET  → a projekt alaprajzainak listája
// POST → új alaprajz regisztrálása (a kép feltöltése külön, Vercel Blob-ra
//        történik — ide a kész imageUrl érkezik)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject, canEditTickets } from "@/lib/permissions";

export async function GET(request, { params }) {
  const { projectId } = params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (!canAccessProject(user, projectId)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a projekthez." }, { status: 403 });
  }

  const floorplans = await prisma.floorplan.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ ok: true, floorplans });
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
  // Alaprajzot csak ADMIN vagy GC tölthet fel.
  if (user.role !== "ADMIN" && user.projectRole !== "GC") {
    return NextResponse.json({ ok: false, error: "Csak admin vagy GC tölthet fel alaprajzot." }, { status: 403 });
  }

  const { name, imageUrl, width, height } = await request.json();
  if (!name?.trim() || !imageUrl) {
    return NextResponse.json({ ok: false, error: "Hiányzik a név vagy a kép." }, { status: 400 });
  }

  const floorplan = await prisma.floorplan.create({
    data: { projectId, name: name.trim(), imageUrl, width: width || null, height: height || null },
  });

  return NextResponse.json({ ok: true, floorplan });
}
