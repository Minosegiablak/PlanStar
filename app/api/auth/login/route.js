// app/api/auth/login/route.js
// Belépés kód + PIN párossal. A válasz alapján a kliens tudja, mi a
// következő lépés:
//   - ok: false                 → hibás kód/PIN, vagy nincs aktív hozzáférés
//   - ok: true, needsProjectPick: true, projects: [...]  → válasszon projektet
//   - ok: true, needsProjectPick: false                  → egyenesen belépett

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/password";
import { createSession } from "@/lib/session";
import { getActiveProjectsFor } from "@/lib/auth";

export async function POST(request) {
  const { code, pin } = await request.json();

  if (!code?.trim() || !pin?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Add meg az azonosító kódot és a PIN-t." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  // Szándékosan ugyanazt az üzenetet adjuk vissza, ha a kód nem létezik,
  // mint ha a PIN hibás — így egy támadó nem tudja kitalálni, mely kódok
  // léteznek a próbálkozásokból.
  const genericError = "Hibás azonosító kód vagy PIN.";

  if (!user) {
    return NextResponse.json({ ok: false, error: genericError }, { status: 401 });
  }

  const pinOk = await verifyPin(pin.trim(), user.pinHash);
  if (!pinOk) {
    return NextResponse.json({ ok: false, error: genericError }, { status: 401 });
  }

  if (!user.active) {
    return NextResponse.json(
      {
        ok: false,
        error: "Ez a hozzáférés fel van függesztve. Fizetési elmaradás esetén vedd fel a kapcsolatot az adminnal.",
      },
      { status: 403 }
    );
  }

  // ADMIN: nincs projektválasztás, globális hozzáférés.
  if (user.role === "ADMIN") {
    await createSession({ userId: user.id, role: user.role, projectId: null });
    return NextResponse.json({ ok: true, needsProjectPick: false, role: "ADMIN" });
  }

  // GC / TRADE / INVESTOR: meg kell néznünk, hány aktív projektje van.
  const projects = await getActiveProjectsFor(user.id);

  if (projects.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Nincs aktív hozzáférése. Vedd fel a kapcsolatot az adminnal.",
      },
      { status: 403 }
    );
  }

  if (projects.length === 1) {
    // egyetlen aktív projekt → egyenesen belépünk, nincs szükség választásra
    const only = projects[0];
    await createSession({ userId: user.id, role: user.role, projectId: only.projectId });
    return NextResponse.json({ ok: true, needsProjectPick: false, role: user.role });
  }

  // több aktív projekt → a session "félkész" (projectId még nincs benne),
  // a kliens a /api/auth/select-project route-tal fejezi be a belépést
  await createSession({ userId: user.id, role: user.role, projectId: null });
  return NextResponse.json({ ok: true, needsProjectPick: true, projects });
}
