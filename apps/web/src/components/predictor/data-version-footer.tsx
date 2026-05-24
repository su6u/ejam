"use client";

import type { PredictionProvenance } from "@ejam/data";

const DATA_DOC_URL = "https://github.com/su6u/ejam/blob/main/DATA.md";

export function DataVersionFooter({
  provenance,
}: {
  provenance: PredictionProvenance | null | undefined;
}) {
  if (!provenance?.manifest_version) return null;

  return (
    <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
      Data {provenance.manifest_version}
      {" · "}
      <a
        href={DATA_DOC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        how we source data
      </a>
    </p>
  );
}
