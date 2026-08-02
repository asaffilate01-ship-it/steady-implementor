import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outputDirectory = process.env.RELEASE_EVIDENCE_DIR?.trim() || "release-evidence";
const repository = process.env.GITHUB_REPOSITORY?.trim() || "local/parkpunkt";
const commitSha = process.env.GITHUB_SHA?.trim() || "local-verification";
const runId = process.env.GITHUB_RUN_ID?.trim() || "local";
const serverUrl = process.env.GITHUB_SERVER_URL?.trim() || "https://github.com";
const publicAppUrl = process.env.PUBLIC_APP_URL?.trim() || "not-configured-locally";
const runUrl = runId === "local" ? "local" : `${serverUrl}/${repository}/actions/runs/${runId}`;
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));

mkdirSync(outputDirectory, { recursive: true });

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  repository,
  commitSha,
  ref: process.env.GITHUB_REF?.trim() || "local",
  workflowRun: runUrl,
  publicAppUrl,
  nodeVersion: process.version,
  lockfileVersion: packageLock.lockfileVersion,
  releaseScope: "production-web",
  featurePolicy: {
    smartMapEnabled: process.env.VITE_FEATURE_SMART_MAP === "true",
    ticketScannerEnabled: process.env.VITE_FEATURE_TICKET_SCANNER === "true",
  },
};

writeFileSync(
  join(outputDirectory, "release-summary.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
);

const markdown = [
  "# ParkPunkt release evidence",
  "",
  `- Commit: \`${commitSha}\``,
  `- Repository: \`${repository}\``,
  `- Workflow: ${runUrl}`,
  `- Public origin: ${publicAppUrl}`,
  `- Generated: ${evidence.generatedAt}`,
  "- Scope: production web release",
  "- Smart map prototype: disabled",
  "- Ticket scanner prototype: disabled",
  "",
  "The artifact also contains the sanitized production-configuration result and CycloneDX SBOM.",
  "",
].join("\n");

writeFileSync(join(outputDirectory, "release-summary.md"), markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}

console.log(`Release evidence written to ${outputDirectory} without secret values.`);
