import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "inventory_session";
const PUBLIC_EXACT = [
  "/",
  "/login",
  "/register",
  "/about",
  "/privacy",
  "/terms",
  "/accessibility",
  "/contact",
];
const PUBLIC_PREFIX = ["/api/auth/login", "/api/auth/register"];
const PUBLIC_API = ["/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_API.includes(pathname) ||
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
    const secretRaw = process.env.AUTH_SECRET?.trim();
    if (!secretRaw && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "השרת לא מוגדר כראוי: חסר מפתח אבטחה" },
        { status: 500 }
      );
    }
    const secret = new TextEncoder().encode(
      secretRaw || "inventory-dev-secret-change-me"
    );
    const { payload } = await jwtVerify(token, secret);
    const role = String(payload.role || "VIEWER");
    const mustChangePassword = Boolean(payload.mustChangePassword);

    // חובה להחליף סיסמה זמנית לפני שימוש במערכת
    if (mustChangePassword) {
      const allowed =
        pathname === "/account/password" ||
        pathname.startsWith("/api/auth/change-password") ||
        pathname.startsWith("/api/auth/logout") ||
        pathname.startsWith("/api/auth/me");
      if (!allowed) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "יש להחליף סיסמה לפני המשך השימוש", code: "MUST_CHANGE_PASSWORD" },
            { status: 403 }
          );
        }
        const url = req.nextUrl.clone();
        url.pathname = "/account/password";
        return NextResponse.redirect(url);
      }
    }

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

    // סופר אדמין נשאר בפלטפורמת הניהול (חוץ ממסך החלפת סיסמה)
    if (
      role === "SUPER_ADMIN" &&
      !isAdminArea &&
      !pathname.startsWith("/api/auth") &&
      pathname !== "/account/password"
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
      "/api/pick-templates",
      "/api/outbound-templates",
      "/api/custom-fields",
      "/api/counts",
      "/api/import",
      "/api/bulk",
      "/api/admin",
      "/api/team",
      "/api/purchase-orders",
      "/api/sales-orders",
      "/api/documents",
      "/api/customers",
      "/api/price-lists",
      "/api/returns",
      "/api/transfers",
      "/api/shipments",
      "/api/lots",
      "/api/serials",
      "/api/reorder",
      "/api/kits",
    ];
    const isWrite =
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      writePaths.some((p) => pathname.startsWith(p));
    if (isWrite && role === "VIEWER") {
      return NextResponse.json({ error: "אין הרשאה לביצוע פעולה" }, { status: 403 });
    }
    // ניהול עובדים — מנהל חברה בלבד
    if (
      pathname.startsWith("/api/team") &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      role !== "ADMIN" &&
      role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "רק מנהל חברה יכול לנהל עובדים" },
        { status: 403 }
      );
    }

    // Audit — מנהל חברה בלבד
    if (pathname === "/audit" || pathname.startsWith("/audit/")) {
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
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
