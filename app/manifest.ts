import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tensor Strength",
    short_name: "Tensor",
    description: "Your Tensor Strength client portal — programs, tools and a direct line to your coach.",
    start_url: "/clients",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0420",
    theme_color: "#0a0420",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
