import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stamp Atelier - LINEスタンプ工房", short_name: "Stamp Atelier",
    description: "画像1枚からオリジナルLINEスタンプシートを作成",
    start_url: "/", display: "standalone", background_color: "#fbfaf6",
    theme_color: "#596d55", lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}