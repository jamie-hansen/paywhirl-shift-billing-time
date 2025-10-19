import axios from "axios";
import { PAYWHIRL_BASE } from "./config.js";

export const pw = axios.create({
  baseURL: PAYWHIRL_BASE,
  timeout: 20000,
  headers: { "Content-Type": "application/json" }
});

export function applyAuth() {
  const token = (process.env.PAYWHIRL_API_TOKEN || "").trim();
  const shop = (process.env.SHOP_DOMAIN || "").trim(); // e.g. my-store.myshopify.com
  if (!token) throw new Error("Missing PAYWHIRL_API_TOKEN");
  if (!shop) throw new Error("Missing SHOP_DOMAIN");
  pw.interceptors.request.use(cfg => {
    cfg.headers["X-Api-Token"] = token;
    cfg.headers["X-Shop-Domain"] = shop;
    return cfg;
  });
}
