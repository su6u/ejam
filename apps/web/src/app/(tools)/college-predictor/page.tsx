import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/predictor/dashboard";

export const metadata: Metadata = {
  title: "College Predictor",
  description:
    "Estimate admission chances across JoSAA, CSAB, and JEE Advanced from your rank.",
};

export default function CollegePredictorPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
