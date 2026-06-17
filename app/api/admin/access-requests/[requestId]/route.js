// app/api/admin/access-requests/[requestId]/route.js
// PATCH → a kérés állapotának kezelése:
//   { action: "mark-paid" }    → fizetés beérkezett (jövőbeli automatizmus
//                                 belépési pontja is lehet)
//   { action: "approve" }      → jóváhagyás: kód+PIN generálása, User és
//                                 ProjectMember létrehozása
//   { action: "reject" }       → elutasítás
// (csak ADMIN-nak)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateTradeCode, generatePin } from "@/lib/codes";
import { hashPin } from "@/lib/password";

export async function PATCH(request, { params }) {
  const { requestId } = params;
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Csak admin férhet hozzá." }, { status: 403 });
  }

  const accessRequest = await prisma.accessRequest.findUnique({ where: { id: requestId } });
  if (!accessRequest) {
    return NextResponse.json({ ok: false, error: "A kérés nem található." }, { status: 404 });
  }

  const { action, paymentRef } = await request.json();

  if (action === "mark-paid") {
    const updated = await prisma.accessRequest.update({
      where: { id: requestId },
      data: { paymentStatus: "BEERKEZETT", paymentRef: paymentRef || "" },
    });
    return NextResponse.json({ ok: true, accessRequest: updated });
  }

  if (action === "reject") {
    const updated = await prisma.accessRequest.update({
      where: { id: requestId },
      data: { status: "ELUTASITVA" },
    });
    return NextResponse.json({ ok: true, accessRequest: updated });
  }

  if (action === "approve") {
    if (accessRequest.status !== "FUGGOBEN") {
      return NextResponse.json({ ok: false, error: "A kérés már nincs függőben." }, { status: 400 });
    }
    const paymentOk = accessRequest.paymentStatus === "BEERKEZETT" || accessRequest.paymentStatus === "ELENGEDVE";
    if (!paymentOk) {
      return NextResponse.json(
        { ok: false, error: "Kód csak a befizetés beérkezése (vagy díjmentesség) után adható ki." },
        { status: 400 }
      );
    }

    const code = await generateTradeCode(accessRequest.trade);
    const pin = generatePin();
    const pinHash = await hashPin(pin);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          code,
          pinHash,
          role: "TRADE",
          name: accessRequest.companyName,
          phone: accessRequest.phone || null,
          active: true,
        },
      });
      await tx.projectMember.create({
        data: {
          userId: newUser.id,
          projectId: accessRequest.projectId,
          role: "TRADE",
          trade: accessRequest.trade,
          active: true,
        },
      });
      const updatedRequest = await tx.accessRequest.update({
        where: { id: requestId },
        data: { status: "KOD_KIADVA", issuedCode: code, issuedPin: pin },
      });
      return { newUser, updatedRequest };
    });

    // A PIN-t csak ITT, egyszer adjuk vissza nyersen (hogy az admin elküldhesse).
    // Az adatbázisban már csak a titkosított változata van.
    return NextResponse.json({
      ok: true,
      accessRequest: result.updatedRequest,
      issuedCode: code,
      issuedPin: pin,
    });
  }

  return NextResponse.json({ ok: false, error: "Ismeretlen művelet." }, { status: 400 });
}
