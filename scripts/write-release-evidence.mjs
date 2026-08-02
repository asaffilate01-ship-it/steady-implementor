import { createHash } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const outputDirectory = process.env.RELEASE_EVIDENCE_DIR?.trim() || "release-evidence";
const repository = process.env.GITHUB_REPOSITORY?.trim() || "local/parkpunkt";
const commitSha = process.env.GITHUB_SHA?.trim() || "local-verification";
const runId = process.env.GITHUB_RUN_ID?.trim() || "local";
const serverUrl = process.env.GITHUB_SERVER_URL?.trim() || "https://github.com";
const publicAppUrl = process.env.PUBLIC_APP_URL?.trim() || "not-configured-locally";
const runUrl = runId === "local" ? "local" : `${serverUrl}/${repository}/actions/runs/${runId}`;
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const releaseScope = process.env.RELEASE_SCOPE?.trim() || "production-web";
const releaseName = process.env.RELEASE_NAME?.trim() || "not-recorded";

const validationEnvironment = {
  dependencyInstall: "EVIDENCE_DEPENDENCY_INSTALL",
  productionConfiguration: "EVIDENCE_PRODUCTION_CONFIGURATION",
  sourceVerification: "EVIDENCE_SOURCE_VERIFICATION",
  dependencyAudit: "EVIDENCE_DEPENDENCY_AUDIT",
  browserRuntime: "EVIDENCE_BROWSER_RUNTIME",
  browserSmoke: "EVIDENCE_BROWSER_SMOKE",
  softwareBillOfMaterials: "EVIDENCE_SOFTWARE_BILL_OF_MATERIALS",
};
const validations = Object.fromEntries(
  Object.entries(validationEnvironment).map(([label, key]) => [
    label,
    process.env[key]?.trim() || "not-recorded",
  ]),
);
const eligibleForProduction =
  releaseScope === "production-web" &&
  Object.values(validations).every((outcome) => outcome === "success");
const releaseStatus =
  process.env.RELEASE_STATUS?.trim() || (eligibleForProduction ? "eligible" : "blocked");

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
  releaseName,
  releaseScope,
  releaseStatus,
  eligibleForProduction,
  rollbackSha: process.env.ROLLBACK_SHA?.trim() || "not-recorded",
  approvalReference: process.env.APPROVAL_REFERENCE?.trim() || "not-recorded",
  validations,
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
  `- Release: ${releaseName}`,
  `- Scope: ${releaseScope}`,
  `- Status: **${releaseStatus}**`,
  `- Production eligible: ${eligibleForProduction ? "yes" : "no"}`,
  `- Rollback commit: ${evidence.rollbackSha}`,
  `- Approval reference: ${evidence.approvalReference}`,
  `- Smart map prototype: ${evidence.featurePolicy.smartMapEnabled ? "enabled" : "disabled"}`,
  `- Ticket scanner prototype: ${evidence.featurePolicy.ticketScannerEnabled ? "enabled" : "disabled"}`,
  "",
  "## Validation outcomes",
  "",
  ...Object.entries(validations).map(([label, outcome]) => `- ${label}: ${outcome}`),
  "",
  "The artifact includes the available sanitized configuration result, CycloneDX SBOM and a SHA-256 manifest.",
  "",
].join("\n");

writeFileSync(join(outputDirectory, "release-summary.md"), markdown);

const manifestFiles = readdirSync(outputDirectory)
  .filter((name) => name !== "manifest.sha256.json")
  .sort()
  .map((name) => {
    const path = join(outputDirectory, name);
    const body = readFileSync(path);
    return {
      name,
      bytes: statSync(path).size,
      sha256: createHash("sha256").update(body).digest("hex"),
    };
  });

writeFileSync(
  join(outputDirectory, "manifest.sha256.json"),
  `${JSON.stringify({ schemaVersion: 1, files: manifestFiles }, null, 2)}\n`,
);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}

console.log(`Release evidence written to ${outputDirectory} without secret values.`);
