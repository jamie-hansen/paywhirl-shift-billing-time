import { applyAuth } from "./client.js";
import axios from "axios";

const BASES = [
  "https://api.shop.paywhirl.com",          // unversioned
  "https://api.shop.paywhirl.com/2022-04",  // versioned
  "https://api.paywhirl.com"                // legacy
];

const PATHS = [
  "/subscriptions?limit=1",
  "/shopify/subscriptions?limit=1",
  "/customers?limit=1",
  "/shopify/customers?limit=1"
];

async function tryOne(base, path) {
  const t = (process.env.PAYWHIRL_API_TOKEN || "").trim();
  const shop = (process.env.SHOP_DOMAIN || "").trim();
  const cli = axios.create({
    baseURL: base,
    timeout: 15000,
    headers: {
      "X-Api-Token": t,
      "X-Shop-Domain": shop,
      "Content-Type": "application/json"
    }
  });
  try {
    const r = await cli.get(path);
    console.log("OK", base + path, r.status, Array.isArray(r.data), typeof r.data);
  } catch (e) {
    const s = e?.response?.status;
    const d = e?.response?.data || String(e);
    console.log("FAIL", base + path, s, d);
  }
}

applyAuth();

for (const b of BASES) {
  for (const p of PATHS) {
    await tryOne(b, p);
  }
}
