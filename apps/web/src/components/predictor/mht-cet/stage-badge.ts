import type { MhtCetStageSemanticsId } from "@ejam/data/mht-cet/browser";

const STAGE_BADGES: Record<
  Exclude<MhtCetStageSemanticsId, "standard">,
  { short: string; full: string }
> = {
  "ladies-to-male-same-category": {
    short: "Ladies→base",
    full: "Ladies seat converted",
  },
  "pwd-released-to-base-category": {
    short: "PwD→base",
    full: "PwD seat converted",
  },
  "defence-released-to-base-category": {
    short: "Def→base",
    full: "Defence seat converted",
  },
  "minority-to-maharashtra": {
    short: "→MH",
    full: "Converted to Maharashtra",
  },
  "unrestricted-maharashtra-merit": {
    short: "→Open",
    full: "Converted to open",
  },
};

export function getMhtCetStageBadgeLabel(
  semantics: MhtCetStageSemanticsId,
): string | null {
  if (semantics === "standard") return null;
  return STAGE_BADGES[semantics].full;
}

export function getMhtCetStageBadgeShortLabel(
  semantics: MhtCetStageSemanticsId,
): string | null {
  if (semantics === "standard") return null;
  return STAGE_BADGES[semantics].short;
}
