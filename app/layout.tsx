import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { env } from "@/lib/env";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  applicationName: "Sift",
  title: {
    default: "Sift — Find the right AI agent for the job",
    template: "%s | Sift",
  },
  description:
    "Discover, compare, and safely hire autonomous agents on BNB Chain.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body
        suppressHydrationWarning
        data-runtime-environment={env.NODE_ENV}
        className="min-h-full"
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
