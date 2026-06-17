// app/api/auth/select-project/route.js
// Akkor hívja a kliens, amikor a felhasználónak több aktív projektje van,
// és a bejelentkezés után megválasztotta, melyikbe szeretne belépni.

import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session";
import { getActiveProjectsFor } from "@/lib/auth";

export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }

  const { projectId } = await request.json();
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "Hiányzik a projectId." }, { status: 400 });
  }

  // Biztonsági ellenőrzés: a usernek tényleg aktív hozzáférése van-e
  // EHHEZ a projekthez? (Nem fogadunk el akármilyen projectId-t a kliens
  // kérésében — ezt szerveroldalon ellenőrizzük, sosem bízunk a kliensben.)
  const activeProjects = await getActiveProjectsFor(session.userId);
  const match = activeProjects.find((p) => p.projectId === projectId);
  if (!match) {
    return NextResponse.json(
      { ok: false, error: "Ehhez a projekthez nincs aktív hozzáférésed." },
      { status: 403 }
    );
  }

  await updateSession({ projectId });
  return NextResponse.json({ ok: true });
}
