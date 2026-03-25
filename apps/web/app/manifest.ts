import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SocialHub",
    short_name: "SocialHub",
    description: "Connect, share, and showcase your life.",
    start_url: "/feed",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["social", "lifestyle"],
    screenshots: [],
  }
}
