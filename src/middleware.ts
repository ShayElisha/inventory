import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "inventory_session";
const PUBLIC_EXACT = ["/", "/login", "/register"];
const PUBLIC_PREFIX = ["/api/auth/login", "/api/auth/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIX.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
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

    const isAdminArea =
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/api/admin");

    if (isAdminArea && role !== "SUPER_ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "אין הרשאת סופר אדמין" }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // סופר אדמין נשאר בפלטפורמת הניהול
    if (
      role === "SUPER_ADMIN" &&
      !isAdminArea &&
      !pathname.startsWith("/api/auth")
    ) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "סופר אדמין משתמש ב־/api/admin בלבד" },
          { status: 403 }
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

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
      "/api/admin",
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
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)"],
};
