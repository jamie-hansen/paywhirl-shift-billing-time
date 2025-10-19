import { pw, applyAuth } from "./client.js";
import { readSubscriptionIds, writeReport } from "./io.js";
import { snapToNinePacific, fmtPacific } from "./time.js";
import { DRY_RUN, INPUT_CSV, APPLY_TO_ALL, REQUESTS_PER_MINUTE } from "./config.js";
import pLimit from "p-limit";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function throttle(fnList, perMinute) {
  const limit = pLimit(5); // small concurrency
  const interval = 60000;
  let count = 0, windowStart = Date.now();
  const out = [];
  for (const fn of fnList) {
    if (count >= perMinute) {
      const elapsed = Date.now() - windowStart;
      if (elapsed < interval) await sleep(interval - elapsed);
      windowStart = Date.now();
      count = 0;
    }
    out.push(limit(async () => { count++; return fn(); }));
  }
  return Promise.all(out);
}

async function getSubscription(subId) {
  const { data } = await pw.get(`/subscription/${subId}`);
  return data;
}

async function getUpcomingInvoicesForCustomer(customerId) {
  const { data } = await pw.get(`/invoices/${customerId}`); // upcoming by default
  return Array.isArray(data) ? data : [];
}

async function updateInvoiceNextPayment(invoiceId, unixTs, applyAll) {
  const payload = { next_payment_attempt: unixTs, all: !!applyAll };
  const { data } = await pw.post(`/invoices/${invoiceId}/next-payment-date`, payload);
  return data;
}

async function main() {
  applyAuth();
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
      const sub = await getSubscription(subId); // includes customer_id
      result.customer_id = sub.customer_id;

      const invoices = await getUpcomingInvoicesForCustomer(sub.customer_id);
      const target = invoices.find(inv =>
        Number(inv.subscription_id) === Number(subId) &&
        !inv.paid &&
        (inv.status === "Scheduled" || inv.status === "Attempting Payment" || inv.status === "Draft" || inv.status === "Subscribed")
      );

      if (!target) {
        result.status = "no-upcoming-invoice-for-subscription";
        return result;
      }

      result.invoice_id = target.id;
      result.old_next_attempt_pacific = fmtPacific(target.next_payment_attempt);

      const newUnix = snapToNinePacific(target.next_payment_attempt);
      result.new_next_attempt_pacific = fmtPacific(newUnix);

      if (DRY_RUN) {
        result.status = "dry-run";
        return result;
      }

      const updated = await updateInvoiceNextPayment(target.id, newUnix, APPLY_TO_ALL);
      // echo final value
      result.status = "updated";
      result.old_next_attempt_pacific = fmtPacific(target.next_payment_attempt);
      result.new_next_attempt_pacific = fmtPacific(updated.next_payment_attempt ?? newUnix);
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
