import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "inventory_session";
const PUBLIC = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "inventory-dev-secret-change-me"
    );
    const { payload } = await jwtVerify(token, secret);
    const role = String(payload.role || "VIEWER");
    const writePaths = [
      "/api/stock",
      "/api/products",
      "/api/locations",
      "/api/categories",
      "/api/suppliers",
      "/api/picks",
      "/api/counts",
      "/api/import",
      "/api/bulk",
    ];
    const isWrite =
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      writePaths.some((p) => pathname.startsWith(p));
    if (isWrite && role === "VIEWER") {
      return NextResponse.json({ error: "אין הרשאה לביצוע פעולה" }, { status: 403 });
    }
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
