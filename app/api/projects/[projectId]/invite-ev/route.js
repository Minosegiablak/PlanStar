// app/api/projects/[projectId]/invite-ev/route.js
// POST → a GC (vagy admin) közvetlenül létrehoz egy Építésvezető (EV) felhasználót
//        és hozzárendeli a saját projektjéhez (ProjectMember), admin-jóváhagyás
//        nélkül. Az EV a GC-vel azonos jogkört kap a projektben.
//
// Csak a projekt saját GC-je (vagy ADMIN) hívhatja.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hashPin } from "@/lib/password";
import { generateUserCode, generatePin } from "@/lib/codes";

export async function POST(request, { params }) {
  const { projectId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }

  // Jogosultság: csak ADMIN, vagy a projekt saját GC-je hívhatja ezt.
  const isAdmin = user.role === "ADMIN";
  let isProjectGc = false;

  if (!isAdmin) {
    const membership = await prisma.projectMember.findFirst({
      where: { userId: user.id, projectId, role: "GC", active: true },
    });
    isProjectGc = Boolean(membership);
  }

  if (!isAdmin && !isProjectGc) {
    return NextResponse.json(
      { ok: false, error: "Csak a projekt generálkivitelezője hívhat meg Építésvezetőt." },
      { status: 403 }
    );
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ ok: false, error: "A projekt nem található." }, { status: 404 });
  }

  const { name, phone, email } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ ok: false, error: "A név megadása kötelező." }, { status: 400 });
  }

  const code = await generateUserCode("EV");
  const pin = generatePin();

  const newUser = await prisma.user.create({
    data: {
      code,
      pinHash: await hashPin(pin),
      role: "EV",
      name: name.trim(),
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      active: true,
    },
  });

  await prisma.projectMember.create({
    data: {
      userId: newUser.id,
      projectId,
      role: "EV",
      trade: null,
      active: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: newUser.id,
      code: newUser.code,
      name: newUser.name,
      role: newUser.role,
    },
    pin,
  });
}

