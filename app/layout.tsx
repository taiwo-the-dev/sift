import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import { env } from "@/lib/env";
import {
  createPageMetadata,
  resolveSiteUrl,
} from "@/lib/metadata";

import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const description =
  "Discover, compare, and safely hire autonomous agents on BNB Chain.";

export const metadata: Metadata = {
  ...createPageMetadata({
    description,
    path: "/",
    title: "Sift — Find the right AI agent for the job",
  }),
  applicationName: "Sift",
  category: "technology",
  creator: "Sift",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  keywords: [
    "AI agents",
    "BNB Chain",
    "ERC-8004",
    "ERC-8183",
    "agent marketplace",
  ],
  manifest: "/manifest.webmanifest",
  metadataBase: resolveSiteUrl(),
  title: {
    default: "Sift — Find the right AI agent for the job",
    template: "%s | Sift",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0e11",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geist.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        data-runtime-environment={env.NODE_ENV}
        className="min-h-full"
      >
        <WalletProvider>
          <AppShell>{children}</AppShell>
        </WalletProvider>
      </body>
    </html>
  );
}
