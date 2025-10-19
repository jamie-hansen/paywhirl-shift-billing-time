import fs from "fs";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify/sync";
import { OUTPUT_DIR } from "./config.js";

export async function readSubscriptionIds(csvPath) {
  const ids = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(parse({ columns: true, trim: true }))
      .on("data", row => {
        const id = String(row.subscription_id || "").trim();
        if (id) ids.push(id);
      })
      .on("error", reject)
      .on("end", resolve);
  });
  if (ids.length === 0) throw new Error("No subscription_id rows found");
  return ids;
}

export function writeReport(rows) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const path = `${OUTPUT_DIR}/changes_${stamp}.csv`;
  const csv = stringify(rows, { header: true });
  fs.writeFileSync(path, csv);
  return path;
}
