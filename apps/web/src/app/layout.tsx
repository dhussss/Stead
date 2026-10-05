import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stead",
  description: "Dan's whole-life system",
  appleWebApp: { capable: true, title: "Stead", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#d9e4f0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" data-theme="ocean-coral">
      <body>{children}</body>
    </html>
  );
}
