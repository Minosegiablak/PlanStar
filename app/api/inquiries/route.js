// app/api/inquiries/route.js
// POST → a landing oldal "Érdeklődöm" űrlapjának beküldése. Bárki
//        elérheti bejelentkezés nélkül.
// GET  → az érdeklődések listája (csak ADMIN-nak)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request) {
  const { company, contact, phone, email, message } = await request.json();

  if (!company?.trim() || !(phone?.trim() || email?.trim())) {
    return NextResponse.json(
      { ok: false, error: "Cégnév és legalább egy elérhetőség (telefon vagy email) szükséges." },
      { status: 400 }
    );
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      company: company.trim(),
      contact: contact?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      message: message?.trim() || null,
    },
  });

  // TODO (jövőbeli automatizálás): itt küldhetnénk emailt az adminnak
  // (pl. Resend-del), hogy azonnal értesüljön az új érdeklődésről.

  return NextResponse.json({ ok: true, inquiry: { id: inquiry.id } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Csak admin férhet hozzá." }, { status: 403 });
  }

  const inquiries = await prisma.inquiry.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, inquiries });
}
