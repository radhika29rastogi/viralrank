import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Razorpay Standard Web Checkout for ViralRank payments.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: LayoutProps<"/checkout">) {
  return children;
}
