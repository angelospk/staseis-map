// The empty files the first-ETA ping asks for (src/lib/etaPing.ts): a GET of one answers 200, so the page's
// console stays clean, and Cloudflare's zone analytics count each path. Run after the build: bun scripts/eta-paths.ts dist
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { etaPaths } from "../src/lib/etaPing";

const out = process.argv[2] ?? "dist";
const paths = etaPaths();
for (const p of paths) {
  const f = join(out, p);
  await mkdir(dirname(f), { recursive: true });
  await writeFile(f, "");
}
console.log(`eta-paths: ${paths.length} files`);
