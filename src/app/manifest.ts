import type { MetadataRoute } from "next";
import { siteConfig } from "./seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.koreanName,
    short_name: "아쉬탕가 게임",
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: siteConfig.themeColor,
    theme_color: siteConfig.themeColor,
    lang: "ko",
    categories: ["education", "fitness", "games"],
    icons: [
      {
     src: "/icons/icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any maskable",
  },
  {
    src: "/icons/icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any maskable",
  },
],
  };
}
