"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Feather } from "lucide-react"
import { TopBar } from "@/components/common/TopBar"
import { LeftSidebar } from "@/components/common/LeftSidebar"
import { RightSidebar } from "@/components/common/RightSidebar"
import { MobileBottomNav } from "@/components/common/MobileBottomNav"

const ComposeModal = dynamic(
  () => import("@/components/common/ComposeModal").then((m) => ({ default: m.ComposeModal })),
  { ssr: false }
)

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [composing, setComposing] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="mx-auto max-w-[1280px] flex">
        <LeftSidebar onCompose={() => setComposing(true)} />

        <main className="flex-1 min-w-0 min-h-[calc(100vh-3rem)] pb-20 md:pb-0">
          {children}
        </main>

        <RightSidebar />
      </div>

      {/* Mobile FAB compose */}
      <button
        onClick={() => setComposing(true)}
        aria-label="New Post"
        className="fixed bottom-20 right-4 z-50 md:hidden h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl active:scale-95 transition-all"
      >
        <Feather className="h-6 w-6" />
      </button>

      <MobileBottomNav />

      <ComposeModal open={composing} onClose={() => setComposing(false)} />
    </div>
  )
}
