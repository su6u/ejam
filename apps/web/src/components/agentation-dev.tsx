"use client";

import dynamic from "next/dynamic";

const AgentationOverlay =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("agentation").then(({ Agentation }) => {
            function DevAgentation() {
              return <Agentation endpoint="http://localhost:4747" />;
            }
            return DevAgentation;
          }),
        { ssr: false },
      )
    : () => null;

export function AgentationDev() {
  return <AgentationOverlay />;
}
