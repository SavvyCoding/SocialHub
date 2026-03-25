"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Bell, Feather, MessageSquare } from "lucide-react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const { data: countData } = trpc.notification.getCount.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 30_000,
  })
  const unreadCount = countData?.count ?? 0

  const { data: msgCountData } = trpc.message.getUnreadCount.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 15_000,
  })
  const unreadMsgCount = msgCountData?.count ?? 0

  const navItems = [
    { href: "/posts", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Explore" },
    { href: "/notifications", icon: Bell, label: "Alerts", badge: unreadCount },
    { href: "/messages", icon: MessageSquare, label: "DMs", badge: unreadMsgCount },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-14 px-1 pb-safe">
        {navItems.map(({ href, icon: Icon, label, badge }) => {
          const isActive = mounted && (pathname === href || pathname.startsWith(href + "/"))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1 relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-label={label}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full bg-primary" />
              )}
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center leading-none">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}

        {session?.user && (
          <Link
            href={`/profile/${session.user.username}`}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1 relative",
              mounted && pathname.startsWith("/profile") ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="Profile"
          >
            {mounted && pathname.startsWith("/profile") && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full bg-primary" />
            )}
            <Avatar className="h-6 w-6">
              <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? ""} />
              <AvatarFallback className="text-[10px]">
                {session.user.name?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px]">Profile</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
