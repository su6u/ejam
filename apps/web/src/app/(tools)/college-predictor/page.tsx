import {
  loadLatestManifest,
  resolveExamDependencies,
} from "@ejam/data/dependency-resolver";
import { loadExamConfig } from "@ejam/data/exam-config";
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

export const dynamic = "force-dynamic";

function mhtCetCapabilityAvailable(): boolean {
  if (process.env.MHT_CET_ENABLED === "false") return false;
  try {
    const config = loadExamConfig("mht-cet");
    const resolution = resolveExamDependencies({
      examId: "mht-cet",
      dependencies: config.data_dependencies,
      manifest: loadLatestManifest(),
      year: 2026,
    });
    return resolution.publishable;
  } catch {
    return false;
  }
}

export default function CollegePredictorPage() {
  return (
    <AppShell
      identity={collegePredictorIdentity}
      mhtCetEnabled={mhtCetCapabilityAvailable()}
    >
      <Dashboard />
    </AppShell>
  );
}
