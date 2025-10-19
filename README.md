# paywhirl-shift-billing-time
You’ll use PayWhirl’s invoice endpoint to shift “next_payment_attempt” and set all: true so future invoices inherit the new time.
Here’s how your documentation should be revised based on your final, working solution:

Purpose
This Replit tool updates the next scheduled action time for selected Shopify PayWhirl subscriptions to a specific hour (default: 9:00 AM Pacific). It generates a CSV audit log and supports dry runs for safety.

How it Works

Input a CSV of subscription_ids.
For each subscription, the tool:

Fetches the subscription object using the Shopify PayWhirl API.

Reads the nextActionDate field.

Computes a new ISO UTC timestamp corresponding to 9:00 AM America/Los_Angeles on the same date.

Sends a PUT request to
