"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Home, Bell, Search, LogOut, Feather, MessageSquare, Bookmark } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { ComposeModal } from "@/components/common/ComposeModal"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { useSocket } from "@/hooks/useSocket"

export function NavBar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [composing, setComposing] = useState(false)
  const [mounted, setMounted] = useState(false)
  useSocket()

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

  const navLinks = [
    { href: "/feed", icon: Home, label: "Stories" },
    { href: "/posts", icon: Feather, label: "Posts" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/messages", icon: MessageSquare, label: "Messages", badge: unreadMsgCount },
    { href: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
    { href: "/notifications", icon: Bell, label: "Notifications", badge: unreadCount },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between max-w-4xl mx-auto px-4">
          <Link href="/posts" className="text-xl font-bold text-primary">
            SocialHub
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ href, icon: Icon, label, badge }) => {
              const isActive = mounted && (pathname === href || pathname.startsWith(href + "/"))
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "relative rounded-full",
                    isActive && "bg-primary/10 text-primary"
                  )}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                  {badge != null && badge > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center leading-none">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-primary" />
                  )}
                </Link>
              )
            })}
            {session?.user && (
              <Link
                href={`/profile/${session.user.username}`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "relative rounded-full",
                  mounted && pathname.startsWith("/profile") && "bg-primary/10"
                )}
                title="Profile"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? ""} />
                  <AvatarFallback>{session.user.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                </Avatar>
                {mounted && pathname.startsWith("/profile") && (
                  <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-primary" />
                )}
              </Link>
            )}

            {/* Compose button */}
            {session && (
              <button
                onClick={() => setComposing(true)}
                title="New Tweet"
                className="ml-2 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110 transition-all active:scale-95"
              >
                <Feather className="h-4 w-4" />
                <span>Tweet</span>
              </button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </nav>

          {/* Mobile header right side */}
          <div className="flex md:hidden items-center gap-1">
            {session?.user && (
              <Link
                href={`/profile/${session.user.username}`}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full")}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? ""} />
                  <AvatarFallback>{session.user.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                </Avatar>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <ComposeModal open={composing} onClose={() => setComposing(false)} />
    </>
  )
}
