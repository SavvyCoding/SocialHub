import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}
interface AvatarImageProps {
  src: string
  alt: string
  className?: string
}
interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  >
    {children}
  </div>
))
Avatar.displayName = "Avatar"

const AvatarImage = ({ src, alt, className }: AvatarImageProps) => {
  if (!src) return null
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn("object-cover", className)}
      sizes="40px"
    />
  )
}
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium text-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
