import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "الحناوي للديكور", template: "%s | الحناوي" },
  description: "مكتبة مرئية لأعمال الحناوي في الديكور وخزانات الملابس.",
  applicationName: "الحناوي",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: { locale: "ar_SA", type: "website", siteName: "الحناوي للديكور" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1768AA" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body><a className="skip-link" href="#main">انتقل إلى المحتوى</a>{children}</body></html>;
}
