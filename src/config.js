export const PAYWHIRL_BASE = "https://api.paywhirl.com";
export const TARGET_TZ = "America/Los_Angeles"; // Pacific
export const TARGET_HOUR = 9;
export const TARGET_MINUTE = 0;
export const APPLY_TO_ALL = process.env.APPLY_TO_ALL === "false" ? false : true; // default true
export const DRY_RUN = process.env.DRY_RUN === "true";
export const INPUT_CSV = process.env.INPUT_CSV || "subscriptions.csv";
export const OUTPUT_DIR = process.env.OUTPUT_DIR || "out";
export const REQUESTS_PER_MINUTE = 300; // below limit 360/min
