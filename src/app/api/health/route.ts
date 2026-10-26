import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Healthcheck לפרודקשן / Uptime / Checkly */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      ms: Date.now() - started,
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        ms: Date.now() - started,
      },
      { status: 503 }
    );
  }
}
