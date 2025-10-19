import axios from "axios";
import { PAYWHIRL_BASE } from "./config.js";

export const pw = axios.create({
  baseURL: PAYWHIRL_BASE,
  timeout: 20000
});

export function applyAuth() {
  const key = process.env.PAYWHIRL_API_KEY;
  const secret = process.env.PAYWHIRL_API_SECRET;
  if (!key || !secret) throw new Error("Missing PAYWHIRL_API_KEY or PAYWHIRL_API_SECRET");
  pw.defaults.headers.common["api-key"] = key;
  pw.defaults.headers.common["api-secret"] = secret;
}
