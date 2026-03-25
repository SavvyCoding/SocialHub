import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: "SocialHub",
    template: "%s | SocialHub",
  },
  description: "Connect, share, and showcase your life.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "SocialHub",
    title: "SocialHub",
    description: "Connect, share, and showcase your life.",
  },
  twitter: {
    card: "summary",
    title: "SocialHub",
    description: "Connect, share, and showcase your life.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
