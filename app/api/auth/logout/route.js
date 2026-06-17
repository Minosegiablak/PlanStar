// app/api/auth/logout/route.js
// Kijelentkezés: a session-cookie törlése.

import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
