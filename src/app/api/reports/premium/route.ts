import { NextResponse } from "next/server";
import { assertModuleApi } from "@/lib/tenant";

/** בדיקת מודול — הנתונים מגיעים מ־/api/reports/summary */
export async function GET() {
  const gate = await assertModuleApi("reportsPro");
  if (gate.error) return gate.error;
  return NextResponse.json({ ok: true, premium: true });
}
