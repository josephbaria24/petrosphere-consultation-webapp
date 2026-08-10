import fs from "fs";
import path from "path";

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = walk(".");
const names = new Set();
const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/gs;

for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  let m;
  while ((m = re.exec(t))) {
    for (const part of m[1].split(",")) {
      const n = part.trim().split(/\s+as\s+/)[0].trim();
      if (n && n !== "type" && n !== "LucideIcon") names.add(n);
    }
  }
  if (/\btype\s+LucideIcon\b/.test(t) || /import\s+type\s*\{[^}]*LucideIcon/.test(t)) {
    names.add("LucideIcon");
  }
}

console.log([...names].sort().join("\n"));
console.error("COUNT", names.size);
