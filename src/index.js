// src/index.js
import { pw, applyAuth } from "./client.js";
import { readSubscriptionIds, writeReport } from "./io.js";
import { snapToNinePacific, fmtPacific } from "./time.js";
import { DRY_RUN, INPUT_CSV, APPLY_TO_ALL, REQUESTS_PER_MINUTE } from "./config.js";
import pLimit from "p-limit";

// ---------- helpers wired for api.shop.paywhirl.com ----------
async function getSubscription(subId) {
  // subscriptions: versioned works on your probe
  const tries = [
    `/2022-04/subscriptions/${subId}`,
    `/subscriptions/${subId}`,
    `/subscription/${subId}`
  ];
  for (const path of tries) {
    try { const { data } = await pw.get(path); return typeof data === "string" ? JSON.parse(data) : data; }
    catch (e) { if (e?.response?.status !== 404) throw e; }
  }
  throw new Error(`subscription ${subId} not found`);
}

function parseMaybeString(data) {
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
}

async function getUpcomingInvoicesForCustomer(customerId) {
  // invoices: unversioned worked on your probe
  const url = `/invoices?customer_id=${encodeURIComponent(customerId)}&status=upcoming`;
  const { data } = await pw.get(url);
  const body = parseMaybeString(data) ?? {};
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.results)) return body.results;
  return [];
}

async function updateInvoiceNextPayment(invoiceId, unixTs, applyAll) {
  const payload = { next_payment_attempt: unixTs, all: !!applyAll };
  const url = `/invoices/${invoiceId}/next-payment-date`; // unversioned
  const { data } = await pw.post(url, payload);
  return parseMaybeString(data) ?? data;
}

// ---------- small infra ----------
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function throttle(fnList, perMinute) {
  const limit = pLimit(5);
  const windowMs = 60000;
  let count = 0, windowStart = Date.now();
  const out = [];
  for (const fn of fnList) {
    if (count >= perMinute) {
      const elapsed = Date.now() - windowStart;
      if (elapsed < windowMs) await sleep(windowMs - elapsed);
      windowStart = Date.now();
      count = 0;
    }
    out.push(limit(async () => { count++; return fn(); }));
  }
  return Promise.all(out);
}

// ---------- main ----------
async function main() {
  applyAuth(); // requires PAYWHIRL_API_TOKEN and SHOP_DOMAIN
  console.log(DRY_RUN ? "DRY RUN: no changes will be applied." : "LIVE RUN: changes will be applied.");

  const subIds = await readSubscriptionIds(INPUT_CSV);

  const tasks = subIds.map(subId => async () => {
    const result = {
      subscription_id: subId,
      customer_id: "",
      invoice_id: "",
      old_next_attempt_pacific: "",
      new_next_attempt_pacific: "",
      applied_all: APPLY_TO_ALL,
      status: "",
      error: ""
    };

    try {
      const sub = await getSubscription(subId);
      const customerId = sub?.customer_id || sub?.customer?.id || sub?.customerId;
      if (!customerId) {
        result.status = "no-customer-on-subscription";
        return result;
      }
      result.customer_id = customerId;

      const invoices = await getUpcomingInvoicesForCustomer(customerId);

      // try to match invoice to this subscription
      const target = invoices.find(inv => {
        const invSubId = Number(inv.subscription_id ?? inv.subscriptionId ?? inv.subscription?.id);
        return Number(subId) === invSubId && !inv.paid && (inv.status === "upcoming" || inv.status === "Scheduled" || inv.status === "Draft" || inv.status === "Subscribed" || inv.status === "Attempting Payment");
      }) || invoices[0]; // fallback: take first upcoming if API doesn’t echo subscription link

      if (!target) {
        result.status = "no-upcoming-invoice-for-subscription";
        return result;
      }

      const oldTs = Number(target.next_payment_attempt ?? target.nextPaymentAttempt);
      if (!oldTs) {
        result.status = "no-next-payment-attempt-on-invoice";
        return result;
      }

      result.invoice_id = target.id ?? target.invoice_id ?? target.invoiceId ?? "";
      result.old_next_attempt_pacific = fmtPacific(oldTs);

      const newUnix = snapToNinePacific(oldTs);
      result.new_next_attempt_pacific = fmtPacific(newUnix);

      if (DRY_RUN) {
        result.status = "dry-run";
        return result;
      }

      const updated = await updateInvoiceNextPayment(result.invoice_id, newUnix, APPLY_TO_ALL);
      const confirmedTs = Number(updated?.next_payment_attempt ?? updated?.nextPaymentAttempt ?? newUnix);
      result.new_next_attempt_pacific = fmtPacific(confirmedTs);
      result.status = "updated";
      return result;

    } catch (e) {
      result.status = "error";
      result.error = e?.response?.data ? JSON.stringify(e.response.data) : String(e.message || e);
      return result;
    }
  });

  const results = await throttle(tasks, REQUESTS_PER_MINUTE);
  const path = writeReport(results);
  console.log(`Report written: ${path}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
