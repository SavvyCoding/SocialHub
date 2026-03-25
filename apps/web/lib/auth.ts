import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { loginSchema } from "@/lib/validators/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    csrfToken: {
      name: process.env.NEXTAUTH_URL?.startsWith("https") ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: !!process.env.NEXTAUTH_URL?.startsWith("https"),
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        // Fetch username to include in token
        const dbUser = await db.user.findUnique({
          where: { id: user.id! },
          select: { username: true, avatarUrl: true },
        })
        token.username = dbUser?.username
        token.avatarUrl = dbUser?.avatarUrl
      }
      if (trigger === "update" && session) {
        token.username = session.username
        token.avatarUrl = session.avatarUrl
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      if (token.username) session.user.username = token.username as string
      if (token.avatarUrl) session.user.image = token.avatarUrl as string
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-generate username from email when OAuth user is created
      if (!user.email) return
      const base = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "")
      let username = base
      let attempt = 0
      while (await db.user.findUnique({ where: { username } })) {
        attempt++
        username = `${base}${attempt}`
      }
      await db.user.update({
        where: { id: user.id! },
        data: { username, name: user.name ?? username },
      })
    },
  },
})
