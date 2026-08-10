import fs from "fs";
import path from "path";

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === "scripts"
    )
      continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = walk(".");
let changed = 0;

for (const file of files) {
  if (file.replace(/\\/g, "/").endsWith("components/icons.tsx")) continue;
  const original = fs.readFileSync(file, "utf8");
  if (!original.includes("lucide-react")) continue;

  let next = original.replace(
    /from\s*(['"])lucide-react\1/g,
    'from "@/components/icons"'
  );

  // Keep type imports working: `import type { LucideIcon }` still fine
  // Fix: `import { type LucideIcon, ...}` already works with our export

  if (next !== original) {
    fs.writeFileSync(file, next);
    changed += 1;
    console.log("updated", file);
  }
}

console.log("files changed:", changed);
