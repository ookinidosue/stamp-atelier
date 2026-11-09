import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Stamp Atelier | LINEスタンプ工房",
  description: "画像1枚からオリジナルスタンプシートを生成",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Stamp Atelier" },
  applicationName: "Stamp Atelier",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}