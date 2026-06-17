// app/api/projects/route.js
// GET  → a bejelentkezett user projektjeinek listája (ADMIN: az összes;
//        más szerepkör: amihez aktív hozzáférése van)
// POST → új projekt létrehozása. ADMIN: kézzel megadhatja a kódot vagy
//        kérheti az automatikus következő kódot. GC: önállóan is
//        indíthat projektet (de "Függőben" állapotban, amíg az admin
//        nem hagyja jóvá / a fizetés nem érkezik be).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getActiveProjectsFor } from "@/lib/auth";
import { getNextProjectCode } from "@/lib/codes";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tickets: true } } },
    });
    return NextResponse.json({ ok: true, projects });
  }

  const projects = await getActiveProjectsFor(user.id);
  return NextResponse.json({ ok: true, projects });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.projectRole !== "GC") {
    return NextResponse.json(
      { ok: false, error: "Csak admin vagy generálkivitelező indíthat projektet." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "A projekt neve kötelező." }, { status: 400 });
  }

  // Admin megadhat saját kódot, egyébként automatikusan generálódik.
  const code = user.role === "ADMIN" && body?.code?.trim() ? body.code.trim() : await getNextProjectCode();

  // Ha GC indítja, "Függőben" állapotban jön létre — az admin a
  // fizetés beérkezése után aktiválja (paid: true + status frissítés).
  const status = user.role === "ADMIN" ? "Aktív" : "Függőben";
  const paid = user.role === "ADMIN" ? !!body?.paid : false;

  const project = await prisma.project.create({
    data: {
      code,
      name,
      gcName: body?.gcName?.trim() || (user.role !== "ADMIN" ? user.name : null),
      status,
      paid,
    },
  });

  // Ha GC indította, ő automatikusan tagja lesz a saját projektjének.
  if (user.role !== "ADMIN") {
    await prisma.projectMember.create({
      data: { userId: user.id, projectId: project.id, role: "GC", active: true },
    });
  }

  return NextResponse.json({ ok: true, project });
}
