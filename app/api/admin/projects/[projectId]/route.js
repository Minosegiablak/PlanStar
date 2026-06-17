// app/api/admin/projects/[projectId]/route.js
// PATCH → projekt fizetés-állapotának és státuszának módosítása
// (csak ADMIN-nak). Ide kötjük be majd a jövőbeli fizetési automatizmust is.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(request, { params }) {
  const { projectId } = params;
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Csak admin férhet hozzá." }, { status: 403 });
  }

  const { paid, status } = await request.json();
  const data = {};
  if (typeof paid === "boolean") data.paid = paid;
  if (status) data.status = status;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "Nincs mit frissíteni." }, { status: 400 });
  }

  const project = await prisma.project.update({ where: { id: projectId }, data });
  return NextResponse.json({ ok: true, project });
}
