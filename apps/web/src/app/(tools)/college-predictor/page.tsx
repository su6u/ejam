import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/predictor/dashboard";
import { collegePredictorIdentity } from "@/lib/identity";

const description = "doesn't matter yaar";

const ogImage = {
  url: "/media/cp-og.png",
  width: 1200,
  height: 625,
  alt: "College Predictor",
};

export const metadata: Metadata = {
  title: "College Predictor",
  description,
  openGraph: {
    title: "College Predictor",
    description,
    url: "/college-predictor",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "College Predictor",
    description,
    images: [ogImage.url],
  },
};

export default function CollegePredictorPage() {
  return (
    <AppShell identity={collegePredictorIdentity}>
      <Dashboard />
    </AppShell>
  );
}
