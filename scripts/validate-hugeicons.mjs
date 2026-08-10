import fs from "fs";
import { icons as col } from "@iconify-json/hugeicons";
import { getIconData } from "@iconify/utils";

const src = fs.readFileSync("components/icons.tsx", "utf8");
const mapBlock = src.match(/const MAP = \{([\s\S]*?)\} as const/);
if (!mapBlock) {
  console.error("MAP not found");
  process.exit(1);
}
const pairs = [...mapBlock[1].matchAll(/(\w+):\s*"([^"]+)"/g)];
let miss = 0;
for (const [, name, id] of pairs) {
  if (!getIconData(col, id)) {
    console.log("MISS", name, id);
    miss += 1;
  }
}
console.log("checked", pairs.length, "missing", miss);
process.exit(miss ? 1 : 0);
