import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const runEvidenceWriter = (environment) => {
  const directory = mkdtempSync(join(tmpdir(), "parkpunkt-release-evidence-"));
  const result = spawnSync(process.execPath, ["scripts/write-release-evidence.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      RELEASE_EVIDENCE_DIR: directory,
      GITHUB_REPOSITORY: "asaffilate01-ship-it/steady-implementor",
      GITHUB_SHA: "1234567890abcdef1234567890abcdef12345678",
      GITHUB_RUN_ID: "42",
      ...environment,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(readFileSync(join(directory, "release-summary.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(directory, "manifest.sha256.json"), "utf8"));
  rmSync(directory, { recursive: true, force: true });
  return { manifest, summary };
};

test("marks successful CI evidence as a validated candidate, not a production release", () => {
  const { manifest, summary } = runEvidenceWriter({
    RELEASE_SCOPE: "release-candidate",
    RELEASE_STATUS: "validated-candidate",
    EVIDENCE_DEPENDENCY_INSTALL: "success",
    EVIDENCE_PRODUCTION_CONFIGURATION: "not-applicable",
    EVIDENCE_SOURCE_VERIFICATION: "success",
    EVIDENCE_DEPENDENCY_AUDIT: "success",
    EVIDENCE_BROWSER_RUNTIME: "success",
    EVIDENCE_BROWSER_SMOKE: "success",
    EVIDENCE_SOFTWARE_BILL_OF_MATERIALS: "success",
  });

  assert.equal(summary.releaseStatus, "validated-candidate");
  assert.equal(summary.eligibleForProduction, false);
  assert.deepEqual(
    manifest.files.map((file) => file.name),
    ["release-summary.json", "release-summary.md"],
  );
  assert.ok(manifest.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256)));
});

test("records an incomplete production run as blocked", () => {
  const { summary } = runEvidenceWriter({
    RELEASE_SCOPE: "production-web",
    EVIDENCE_DEPENDENCY_INSTALL: "success",
    EVIDENCE_PRODUCTION_CONFIGURATION: "failure",
    EVIDENCE_SOURCE_VERIFICATION: "success",
    EVIDENCE_DEPENDENCY_AUDIT: "success",
    EVIDENCE_BROWSER_RUNTIME: "success",
    EVIDENCE_BROWSER_SMOKE: "success",
    EVIDENCE_SOFTWARE_BILL_OF_MATERIALS: "success",
  });

  assert.equal(summary.releaseStatus, "blocked");
  assert.equal(summary.eligibleForProduction, false);
});

test("marks a production run eligible only when every recorded gate succeeds", () => {
  const successfulOutcomes = Object.fromEntries(
    [
      "DEPENDENCY_INSTALL",
      "PRODUCTION_CONFIGURATION",
      "SOURCE_VERIFICATION",
      "DEPENDENCY_AUDIT",
      "BROWSER_RUNTIME",
      "BROWSER_SMOKE",
      "SOFTWARE_BILL_OF_MATERIALS",
    ].map((name) => [`EVIDENCE_${name}`, "success"]),
  );
  const { summary } = runEvidenceWriter({
    RELEASE_SCOPE: "production-web",
    ...successfulOutcomes,
  });

  assert.equal(summary.releaseStatus, "eligible");
  assert.equal(summary.eligibleForProduction, true);
});
