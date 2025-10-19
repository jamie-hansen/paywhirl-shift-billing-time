import axios from "axios";
import { PAYWHIRL_BASE } from "./config.js";

export const pw = axios.create({
  baseURL: PAYWHIRL_BASE,
  timeout: 20000,
  headers: { "Content-Type": "application/json" }
});

export function applyAuth() {
  const token = process.env.PAYWHIRL_API_TOKEN;
  if (!token) throw new Error("Missing PAYWHIRL_API_TOKEN");
  pw.defaults.headers.common["X-Api-Token"] = token;
  pw.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}
