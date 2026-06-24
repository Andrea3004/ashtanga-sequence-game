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
        src: siteConfig.image,
        sizes: "200x73",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
