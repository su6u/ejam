import { describe, expect, it } from "vitest";
import {
  compareManifestVersions,
  pickLatestManifestFile,
  sortManifestVersionsDesc,
} from "../semver";

describe("compareManifestVersions", () => {
  it("orders v0.10 above v0.9", () => {
    expect(compareManifestVersions("v0.10.0", "v0.9.0")).toBeGreaterThan(0);
  });

  it("orders v0.1.0 above v0.0.9", () => {
    expect(compareManifestVersions("v0.1.0", "v0.0.9")).toBeGreaterThan(0);
  });
});

describe("pickLatestManifestFile", () => {
  it("picks highest semver filename", () => {
    const latest = pickLatestManifestFile([
      "v0.1.0.json",
      "v0.10.0.json",
      "v0.9.0.json",
    ]);
    expect(latest).toBe("v0.10.0.json");
  });
});

describe("sortManifestVersionsDesc", () => {
  it("sorts descending", () => {
    expect(
      sortManifestVersionsDesc(["v0.1.0", "v0.10.0", "v0.9.0"]),
    ).toEqual(["v0.10.0", "v0.9.0", "v0.1.0"]);
  });
});
