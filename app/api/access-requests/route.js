// app/api/access-requests/route.js
// GET  → a projekt hozzáférés-kéréseinek listája (ADMIN: mind; GC: a
//        saját projektjéé)
// POST → új meghívás (GC hívja meg az alvállalkozót, cégadatokkal és a
//        fizető fél megjelölésével)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject } from "@/lib/permissions";

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    const requests = await prisma.accessRequest.findMany({
      include: { project: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, requests });
  }

  if (user.projectRole === "GC" && user.projectId) {
    const requests = await prisma.accessRequest.findMany({
      where: { projectId: user.projectId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, requests });
  }

  return NextResponse.json({ ok: false, error: "Nincs jogosultságod a kérések megtekintéséhez." }, { status: 403 });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }
  if (user.projectRole !== "GC" || !user.projectId) {
    return NextResponse.json(
      { ok: false, error: "Csak generálkivitelező hívhat meg alvállalkozót." },
      { status: 403 }
    );
  }
  if (!canAccessProject(user, user.projectId)) {
    return NextResponse.json({ ok: false, error: "Nincs hozzáférésed ehhez a projekthez." }, { status: 403 });
  }

  const body = await request.json();
  const { trade, companyName, companySeat, taxId, contact, phone, email, payer, amount } = body || {};

  if (!trade?.trim() || !companyName?.trim()) {
    return NextResponse.json({ ok: false, error: "A szakma és a cégnév kötelező." }, { status: 400 });
  }
  if (!["GC", "TRADE"].includes(payer)) {
    return NextResponse.json({ ok: false, error: "A fizető fél (payer) érvénytelen." }, { status: 400 });
  }

  const accessRequest = await prisma.accessRequest.create({
    data: {
      projectId: user.projectId,
      requestedBy: user.name,
      trade: trade.trim(),
      companyName: companyName.trim(),
      companySeat: companySeat?.trim() || null,
      taxId: taxId?.trim() || null,
      contact: contact?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      payer,
      amount: typeof amount === "number" ? amount : 15000,
      paymentStatus: "VART",
      status: "FUGGOBEN",
    },
  });

  return NextResponse.json({ ok: true, accessRequest });
}
