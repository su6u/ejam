import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/predictor/dashboard";

export default function Home() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
