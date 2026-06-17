// lib/auth.js
// Szerveroldali segédfüggvény: megmondja, ki a jelenleg bejelentkezett
// felhasználó, és milyen jogosultsága van a kiválasztott projektben.
//
// FONTOS: minden API route-nak ezt kell hívnia, mielőtt bármilyen adatot
// visszaadna. Ez a "kapuőr" — itt dől el, hogy a kliens fizikailag
// megkapja-e az adatot, vagy nem. Ez a démóból hiányzó, igazi biztonsági
// réteg (a démóban a böngésző maga szűrt, ami megkerülhető lett volna).

import { prisma } from "./prisma";
import { getSession } from "./session";

// Visszaadja a bejelentkezett user adatait + (ha van kiválasztva) az
// aktuális projektbeli tagságát (szerepkör, szakma, aktív-e OTT).
// Ha nincs érvényes session, null-t ad vissza.
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user || !user.active) return null;

  let membership = null;
  if (session.projectId) {
    membership = await prisma.projectMember.findFirst({
      where: { userId: user.id, projectId: session.projectId, active: true },
    });
    if (!membership && user.role !== "ADMIN") {
      // a session projektje már nem érvényes (pl. közben kitiltották onnan)
      return null;
    }
  }

  return {
    id: user.id,
    code: user.code,
    name: user.name,
    phone: user.phone,
    role: user.role, // ADMIN-nál ez a globális szerepkör
    // a kiválasztott projektben érvényes szerepkör/szakma (ADMIN-nál mindig globális)
    projectId: session.projectId || null,
    projectRole: user.role === "ADMIN" ? "ADMIN" : membership?.role || null,
    trade: membership?.trade || null,
  };
}

// Azoknak a projekteknek a listája, amikhez a usernek AKTÍV hozzáférése van.
// Ez kell a projektválasztóhoz bejelentkezés után.
export async function getActiveProjectsFor(userId) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId, active: true },
    include: { project: true },
  });
  return memberships.map((m) => ({
    projectId: m.projectId,
    code: m.project.code,
    name: m.project.name,
    role: m.role,
    trade: m.trade,
  }));
}
