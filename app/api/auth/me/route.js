// app/api/auth/me/route.js
// A kliens ezt hívja, hogy megtudja: be van-e jelentkezve, és ha igen,
// ki ő, milyen szerepkörrel, melyik projektben. Ezt érdemes az app
// indulásakor (és frissítés után) lekérdezni, hogy a felület tudja,
// melyik nézetet mutassa.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, user: null });
  }
  return NextResponse.json({ ok: true, user });
}
