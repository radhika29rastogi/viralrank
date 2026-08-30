import type { Metadata } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getCurrentUser } from "@/lib/queries";
import { siteUrl } from "@/lib/format";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
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
    images: [{ url: "/viralrank-logo.jpg" }],
  },
  icons: {
    icon: "/viralrank-logo.jpg",
    apple: "/viralrank-logo.jpg",
  },
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const { user } = await getCurrentUser();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <SiteHeader signedIn={Boolean(user)} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
