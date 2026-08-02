import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const failures = [];
let trackedFiles = [];

try {
  trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
} catch {
  console.error("FAIL repository hygiene must run inside a Git checkout");
  process.exit(1);
}

const forbiddenTrackedPaths = trackedFiles.filter((path) => {
  const name = path.split("/").at(-1) ?? path;
  if (/^\.env(?:\..+)?$/.test(name) && name !== ".env.example") return true;
  if (/\.(?:pem|p12|pfx)$/i.test(name)) return true;
  return /^(?:id_rsa|id_ed25519)$/.test(name);
});

for (const path of forbiddenTrackedPaths) {
  failures.push(`${path}: sensitive configuration or key file must not be tracked`);
}

const requiredCriticalPaths = ["src/styles.css", "src/routeTree.gen.ts"];
for (const path of requiredCriticalPaths) {
  if (!trackedFiles.includes(path)) failures.push(`${path}: required application file is missing`);
}

const misplacedCriticalPaths = new Map([
  ["styles.css", "src/styles.css"],
  ["routeTree.gen.ts", "src/routeTree.gen.ts"],
]);
for (const [path, expectedPath] of misplacedCriticalPaths) {
  if (trackedFiles.includes(path)) {
    failures.push(`${path}: misplaced duplicate must be removed; use ${expectedPath}`);
  }
}

const rootRoutePath = "src/routes/__root.tsx";
if (
  trackedFiles.includes(rootRoutePath) &&
  !readFileSync(rootRoutePath, "utf8").includes("../styles.css?url")
) {
  failures.push(`${rootRoutePath}: application stylesheet import must resolve to src/styles.css`);
}

const secretSignatures = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Stripe secret key", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/],
  ["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{16,}\b/],
  ["GitHub token", /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  [
    "Supabase service-role assignment",
    /^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!$|<)[^\s#]{16,}\s*$/m,
  ],
];

for (const path of trackedFiles) {
  if (forbiddenTrackedPaths.includes(path) || statSync(path).size > 2_000_000) continue;
  let body;
  try {
    body = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  if (body.includes("\0")) continue;
  for (const [label, pattern] of secretSignatures) {
    if (pattern.test(body)) failures.push(`${path}: possible ${label}`);
  }
}

let pinnedActions = 0;
for (const path of trackedFiles.filter((item) => /^\.github\/workflows\/.*\.ya?ml$/.test(item))) {
  const body = readFileSync(path, "utf8");
  for (const match of body.matchAll(/^\s*-\s+uses:\s*([^@\s]+)@([^\s#]+)/gm)) {
    const [, action, reference] = match;
    if (action.startsWith("./")) continue;
    pinnedActions += 1;
    if (!/^[0-9a-f]{40}$/i.test(reference)) {
      failures.push(`${path}: ${action} must be pinned to a full commit SHA`);
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Repository hygiene passed: ${trackedFiles.length} tracked files, ${pinnedActions} pinned workflow actions, critical paths verified, and no tracked environment files or secret signatures.`,
  );
}
