import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET missing in production.");
    }
    return new TextEncoder().encode("dev-secret-change-me-in-production-1234567890!!");
  }
  return new TextEncoder().encode(secret);
}

const publicPaths = ["/login", "/api/auth/login", "/api/agent"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("study-pack-session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
