"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Dependency-free shadcn-style tooltip. Shows on hover and keyboard focus.

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext() {
  const ctx = React.useContext(TooltipContext)
  if (!ctx) throw new Error("Tooltip components must be used within <Tooltip>")
  return ctx
}

function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  )
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
  children: React.ReactNode
}

function TooltipTrigger({ asChild, children, ...props }: TooltipTriggerProps) {
  const { setOpen } = useTooltipContext()
  const handlers = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>
    return React.cloneElement(child, { ...props, ...handlers, tabIndex: child.props.tabIndex ?? 0 })
  }

  return (
    <span tabIndex={0} {...props} {...handlers}>
      {children}
    </span>
  )
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom"
}

function TooltipContent({ className, side = "top", ...props }: TooltipContentProps) {
  const { open } = useTooltipContext()
  if (!open) return null
  return (
    <div
      role="tooltip"
      className={cn(
        "absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md border bg-background px-3 py-1.5 text-sm text-foreground shadow-md",
        side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        className
      )}
      {...props}
    />
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
