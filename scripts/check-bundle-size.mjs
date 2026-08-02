import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../.output/public/assets/", import.meta.url));
// The app shell includes TanStack Start's runtime and the Supabase auth middleware.
// Keep a hard ceiling just above the measured production entry (about 543 KiB),
// while route-level product surfaces remain independently lazy-loaded.
const maxJavaScriptKiB = 550;
const maxJavaScriptBytes = maxJavaScriptKiB * 1024;
const violations = [];

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else if (entry.name.endsWith(".js")) {
      const size = (await stat(path)).size;
      if (size > maxJavaScriptBytes) violations.push({ path, size });
    }
  }
}

await inspect(root);
if (violations.length > 0) {
  for (const item of violations) {
    console.error(
      `${relative(root, item.path)} is ${(item.size / 1024).toFixed(1)} KiB (budget: ${maxJavaScriptKiB} KiB)`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `Bundle budget passed: every client JavaScript chunk is at most ${maxJavaScriptKiB} KiB.`,
  );
}
