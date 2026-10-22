import type { Metadata, Viewport } from "next";
import { Archivo, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { getStoreSettings } from "@/features/settings/queries";
import { publicEnv } from "@/lib/config/public";
import "./globals.css";

const body = Manrope({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const display = Archivo({
  variable: "--font-display-face",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: `${settings.storeName} — ${settings.tagline || "Online store"}`, template: `%s · ${settings.storeName}` },
    description: settings.tagline || `Shop ${settings.storeName} online.`,
    openGraph: { siteName: settings.storeName, type: "website" },
  };
}

// Turns entrance animations on before first paint (no flash). If the app's
// JavaScript never starts, the class is removed after 3 s so nothing stays hidden.
const MOTION_BOOT = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('motion-ready');setTimeout(function(){if(!d.classList.contains('motion-live'))d.classList.remove('motion-ready')},3000)}catch(e){}})();`;

export const viewport: Viewport = {
  themeColor: "#e9e9e6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Toaster position="bottom-right" richColors closeButton toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
