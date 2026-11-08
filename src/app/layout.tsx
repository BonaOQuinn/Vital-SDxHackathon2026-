import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vital",
  description:
    "A voice interpreter for medical emergencies abroad. Vital translates and organizes information. It does not diagnose and does not replace emergency services.",
  appleWebApp: { capable: true, title: "Vital", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F6F8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-dvh bg-bg text-ink font-sans">{children}</body>
    </html>
  );
}
