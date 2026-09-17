import type { Metadata } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { VisitBeacon } from "@/components/layout/VisitBeacon";
import { siteUrl } from "@/lib/format";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "ViralRank.buzz — Discover. Hype. Rank.",
    template: "%s — ViralRank.buzz",
  },
  description:
    "The paid creator ranking arena. Submit. Hype. Rank. Go Viral.",
  openGraph: {
    title: "ViralRank.buzz — Discover. Hype. Rank.",
    description: "Creators compete for attention. You decide who gets the hype.",
    url: siteUrl(),
    siteName: "ViralRank.buzz",
    type: "website",
    images: [{ url: "/viralrank-logo.jpg", width: 1024, height: 1020, alt: "ViralRank.buzz" }],
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "32x32" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <VisitBeacon />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
