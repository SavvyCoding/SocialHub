import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { SignJWT } from "jose"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)
  const token = await new SignJWT({ id: session.user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret)

  return NextResponse.json({ token })
}
