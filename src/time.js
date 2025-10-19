import { DateTime } from "luxon";
import { TARGET_TZ, TARGET_HOUR, TARGET_MINUTE } from "./config.js";

/**
 * Compute a new Unix timestamp that keeps the same calendar date as the current
 * next_payment_attempt in Pacific time, but sets the time to 09:00.
 */
export function snapToNinePacific(currentUnix) {
  if (!currentUnix || Number.isNaN(Number(currentUnix))) throw new Error("Bad timestamp");
  const currentInPacific = DateTime.fromSeconds(Number(currentUnix), { zone: TARGET_TZ });
  const snapped = currentInPacific.set({ hour: TARGET_HOUR, minute: TARGET_MINUTE, second: 0, millisecond: 0 });
  if (!snapped.isValid) throw new Error("Invalid snapped time");
  // PayWhirl expects a Unix epoch (UTC). Luxon .toSeconds() returns epoch seconds.
  return Math.floor(snapped.toSeconds());
}

export function fmtPacific(unix) {
  return DateTime.fromSeconds(Number(unix), { zone: TARGET_TZ }).toISO({ suppressMilliseconds: true });
}
