// app/api/upload/route.js
// POST → kép feltöltése Vercel Blob-ra. A kliens egy base64 data URL-t küld
// (TicketModal bejegyzés-fotó, vagy alaprajz-kép), a szerver feltölti és
// visszaadja a nyilvános URL-t.
//
// FONTOS: ehhez a Vercel projekt Storage fülén egy Blob store-t is létre
// kell hozni (ugyanúgy, mint a Neon Postgres-t), és a BLOB_READ_WRITE_TOKEN
// env var automatikusan beállítódik.

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";

// data URL → Buffer + content-type szétválasztása
function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  return { contentType, buffer: Buffer.from(base64, "base64") };
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nincs bejelentkezve." }, { status: 401 });
  }

  const { dataUrl } = await request.json();
  if (!dataUrl) {
    return NextResponse.json({ ok: false, error: "Hiányzik a feltöltendő kép." }, { status: 400 });
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Érvénytelen kép formátum." }, { status: 400 });
  }

  // 8 MB feletti feltöltést elutasítjuk (a kliens már 1200px-re skálázza a
  // fotókat, ez csak egy biztonsági felső korlát).
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "A kép túl nagy (max. 8 MB)." }, { status: 400 });
  }

  const ext = parsed.contentType.split("/")[1] || "jpg";
  const filename = `uploads/${user.id}-${Date.now()}.${ext}`;

  try {
    const blob = await put(filename, parsed.buffer, {
      access: "public",
      contentType: parsed.contentType,
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "A kép feltöltése sikertelen: " + err.message }, { status: 500 });
  }
}
