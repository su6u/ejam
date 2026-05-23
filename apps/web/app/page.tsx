import { Suspense } from "react";
import { Dashboard } from "./components/dashboard/dashboard";
import { Navbar } from "./components/navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      {/* 72px = navbar height (h-9 logo + py-5) */}
      <div className="pt-[72px]">
        <Suspense fallback={null}>
          <Dashboard />
        </Suspense>
      </div>
    </>
  );
}
