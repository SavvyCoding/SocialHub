import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  const publicPaths = ["/login", "/register", "/api/auth"]
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", req.url)
    // Only allow relative paths as callback to prevent open redirect
    if (pathname.startsWith("/") && !pathname.startsWith("//")) {
      loginUrl.searchParams.set("callbackUrl", pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/posts", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/trpc|api/socket).*)"],
}
