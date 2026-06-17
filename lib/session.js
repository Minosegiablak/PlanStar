// lib/session.js
// A bejelentkezett felhasználó "emlékezete": egy aláírt, titkosított
// JWT-t teszünk egy httpOnly cookie-ba. A böngésző JavaScriptje nem tudja
// kiolvasni (XSS-védelem), csak a szerver tudja érvényesíteni.
//
// A "jose" könyvtárat használjuk, mert ez működik a Next.js Edge
// futtatási környezetében is (pl. middleware-ben), ellentétben a régebbi
// "jsonwebtoken" csomaggal.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "planstar_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 nap

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Hiányzik a SESSION_SECRET környezeti változó. Generálj egyet és állítsd be a Vercelen."
    );
  }
  return new TextEncoder().encode(secret);
}

// Session létrehozása bejelentkezéskor.
// payload: { userId, role, projectId } — projectId null, ha még nem választott
// projektet (pl. admin, vagy GC, aki több projekt közül választhat).
export async function createSession(payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // a böngésző JS nem érheti el
    secure: process.env.NODE_ENV === "production", // HTTPS-en kötelező
    sameSite: "lax", // jó alapérték, megfelelő védelem a legtöbb esetre
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

// A jelenlegi session kiolvasása (Server Component-ből vagy API route-ból).
// Visszaadja a payloadot, vagy null-t, ha nincs / lejárt a session.
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    // lejárt vagy hamisított token — kezeljük úgy, mintha nem lenne bejelentkezve
    return null;
  }
}

// A session frissítése (pl. amikor a GC kiválaszt egy projektet
// a projektválasztó listából — ekkor a projectId bekerül a sessionbe).
export async function updateSession(partialPayload) {
  const current = await getSession();
  if (!current) throw new Error("Nincs aktív session, amit frissíteni lehetne.");
  const { iat, exp, ...rest } = current; // a régi időbélyegeket nem visszük át
  await createSession({ ...rest, ...partialPayload });
}

// Kijelentkezés: a cookie törlése.
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
