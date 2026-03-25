import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"
import { rateLimit } from "@/lib/rate-limit"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local." }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await rateLimit({ key: `${session.user.id}:cloudinary`, limit: 30, windowSecs: 60 })
  } catch {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const timestamp = Math.round(new Date().getTime() / 1000)
  const folder = `social-platform/${session.user.id}`

  // Eager transformations: generate optimized variants on upload
  const eager = "w_800,f_auto,q_auto|w_200,f_auto,q_auto"

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, eager },
    process.env.CLOUDINARY_API_SECRET!
  )

  return NextResponse.json({
    signature,
    timestamp: String(timestamp),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
    eager,
  })
}
