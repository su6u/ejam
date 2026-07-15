// .dark is pinned; ejam ships dark-only and resolves shadcn tokens
// against the dark palette declared in globals.css

import type { Metadata } from "next";
import {
  IBM_Plex_Sans,
  Instrument_Sans,
  Instrument_Serif,
} from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AgentationDev } from "@/components/agentation-dev";
import { cn } from "@/lib/utils";

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  display: "swap",
  variable: "--font-serif-display",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

const siteUrl = "https://ejam.in";
const siteDescription = "Open-source tools for students around Indian exams";
const ogImage = {
  url: "/media/og.png",
  width: 1200,
  height: 600,
  alt: "ejam",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ejam",
    template: "%s · ejam",
  },
  description: siteDescription,
  applicationName: "ejam",
  manifest: "/identity/site.webmanifest",
  icons: {
    icon: [
      { url: "/identity/favicon.ico", sizes: "48x48" },
      { url: "/identity/favicon.svg", type: "image/svg+xml" },
      {
        url: "/identity/favicon-96x96.png",
        type: "image/png",
        sizes: "96x96",
      },
    ],
    apple: [
      {
        url: "/identity/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "ejam",
    title: "ejam",
    description: siteDescription,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "ejam",
    description: siteDescription,
    images: [ogImage.url],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "dark antialiased",
        ibmPlex.variable,
        instrumentSerif.variable,
        instrumentSans.variable,
        "font-sans",
      )}
    >
      <body suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
            },
          }}
        />
        <AgentationDev />
      </body>
    </html>
  );
}
