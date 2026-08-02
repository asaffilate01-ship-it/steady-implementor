import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const migrationDirectory = resolve(root, "supabase/migrations");
const migrationName = /^([0-9]{14})_[a-zA-Z0-9_-]+\.sql$/;
const files = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const failures = [];
const timestamps = new Map();

for (const file of files) {
  const match = file.match(migrationName);
  if (!match) {
    failures.push(`${file}: filename must start with a 14-digit UTC timestamp`);
    continue;
  }
  const duplicate = timestamps.get(match[1]);
  if (duplicate) failures.push(`${file}: timestamp duplicates ${duplicate}`);
  timestamps.set(match[1], file);
  const path = resolve(migrationDirectory, file);
  if (statSync(path).size === 0) failures.push(`${file}: migration is empty`);
}

const documented = new Set();
for (const directory of [resolve(root, "docs"), root]) {
  for (const file of readdirSync(directory)) {
    if (!file.endsWith(".md")) continue;
    const body = readFileSync(resolve(directory, file), "utf8");
    for (const match of body.matchAll(/`([0-9]{14}_[a-zA-Z0-9_-]+\.sql)`/g)) {
      documented.add(match[1]);
    }
  }
}
for (const file of documented) {
  if (!files.includes(file)) failures.push(`${file}: documentation references a missing migration`);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Migration integrity passed: ${files.length} unique ordered files and ${documented.size} documented references.`,
  );
}
