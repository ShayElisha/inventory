import { NextResponse } from "next/server";
import { getSession, ensureDefaultUsers } from "@/lib/auth";

export async function GET() {
  await ensureDefaultUsers();
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: session });
}
