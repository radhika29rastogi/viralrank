import type { Metadata } from "next";
import { PLATFORM_NAME } from "@/lib/copy/platform";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Contact ${PLATFORM_NAME} support.`,
};

export default function ContactLayout({ children }: LayoutProps<"/contact">) {
  return children;
}
