import { execFileSync } from "node:child_process";

const generatedFiles = ["src/routeTree.gen.ts"];

try {
  execFileSync("git", ["diff", "--exit-code", "--", ...generatedFiles], {
    stdio: "inherit",
  });
  console.log(`Generated source is current: ${generatedFiles.join(", ")}.`);
} catch {
  console.error(
    `FAIL generated source changed during the build. Regenerate and commit: ${generatedFiles.join(", ")}.`,
  );
  process.exitCode = 1;
}
