import { chdir } from "node:process";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { _resetDataRootCache, resolveDataRoot } from "../data-root";

describe("resolveDataRoot", () => {
  const originalCwd = process.cwd();
  const repoRoot = join(originalCwd, "..", "..");
  const originalEnv = process.env.EJAM_DATA_ROOT;

  afterEach(() => {
    chdir(originalCwd);
    _resetDataRootCache();
    if (originalEnv === undefined) {
      delete process.env.EJAM_DATA_ROOT;
    } else {
      process.env.EJAM_DATA_ROOT = originalEnv;
    }
  });

  it("walks up from apps/web to repo data/", () => {
    delete process.env.EJAM_DATA_ROOT;
    chdir(join(repoRoot, "apps", "web"));
    expect(resolveDataRoot()).toBe(join(repoRoot, "data"));
  });
});
