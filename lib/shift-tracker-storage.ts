/** 
 * Storage keys for shift tracker data.
 * Version bumped to v2 for field shortening optimization.
 */
export const STORAGE_SHIFTS = "mywallet_wt_shifts_v2";
export const STORAGE_RATE = "mywallet_wt_rate_v1";
export const STORAGE_TIME_FMT = "mywallet_wt_timefmt_v1";
export const STORAGE_PAY_TO_WALLET = "mywallet_wt_paywallet_v1";
export const STORAGE_META = "mywallet_wt_meta_v1";

export interface ShiftTrackerMeta {
  rate: string
  timeFormat: "12h" | "24h"
  payToWallet: boolean
}

/** Fired when shifts in localStorage change from outside the tracker (e.g. floating log). */
export const SHIFT_STORAGE_UPDATED_EVENT = "wallet-shift-shifts-updated";

/**
 * Optimized Shift interface with shortened field names for storage.
 * 
 * Storage format (shortened):
 * - i: id (number)
 * - d: date (string)
 * - s: start time (string)
 * - e: end time (string)
 * - n: note (string)
 * - h: hours (number)
 * - r: rate (number, optional - only stored if different from global rate)
 * - g: institution (string, optional)
 */
export interface Shift {
  id: number;
  date: string;
  start: string;
  end: string;
  note: string;
  hours: number;
  rate?: number;
  institution?: string;
}

/** Compact storage format for a single shift */
export interface ShiftCompact {
  i: number;  // id
  d: string;  // date
  s: string;  // start
  e: string;  // end
  n: string;  // note
  h: number;  // hours
  r?: number; // rate (optional)
  g?: string; // institution (optional)
}

/** Legacy storage format (v1) */
interface ShiftLegacy {
  id: number;
  date: string;
  start: string;
  end: string;
  note: string;
  hours: number;
  rate?: number;
}

/** Convert compact format to full Shift object */
export function expandShift(compact: ShiftCompact): Shift {
  return {
    id: compact.i,
    date: compact.d,
    start: compact.s,
    end: compact.e,
    note: compact.n,
    hours: compact.h,
    rate: compact.r,
    institution: compact.g,
  };
}

/** Convert full Shift object to compact format */
export function compactShift(shift: Shift): ShiftCompact {
  const compact: ShiftCompact = {
    i: shift.id,
    d: shift.date,
    s: shift.start,
    e: shift.end,
    n: shift.note,
    h: shift.hours,
  };
  if (shift.rate !== undefined) {
    compact.r = shift.rate;
  }
  if (shift.institution) {
    compact.g = shift.institution;
  }
  return compact;
}

/**
 * Migrate data from v1 (legacy) to v2 (compact) format.
 * Returns true if migration was performed.
 */
function migrateFromV1(): boolean {
  const LEGACY_KEY = "mywallet_wt_shifts_v1";
  try {
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (!legacyData) return false;

    const legacyShifts: ShiftLegacy[] = JSON.parse(legacyData);
    
    // Convert to compact format
    const compactShifts: ShiftCompact[] = legacyShifts.map((s: ShiftLegacy) => ({
      i: s.id,
      d: s.date,
      s: s.start,
      e: s.end,
      n: s.note,
      h: s.hours,
      r: s.rate,
    }));

    // Store in new format
    localStorage.setItem(STORAGE_SHIFTS, JSON.stringify(compactShifts));
    
    // Remove old key
    localStorage.removeItem(LEGACY_KEY);
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse shifts from storage, handling both v1 and v2 formats.
 * Automatically migrates v1 data to v2.
 */
export function getShiftsFromStorage(): Shift[] {
  // Try to get v2 data first
  let rawData = localStorage.getItem(STORAGE_SHIFTS);
  
  // If no v2 data, try to migrate from v1
  if (!rawData) {
    if (migrateFromV1()) {
      rawData = localStorage.getItem(STORAGE_SHIFTS);
    }
  }
  
  if (!rawData) return [];
  
  try {
    const compactShifts: ShiftCompact[] = JSON.parse(rawData);
    return compactShifts.map(expandShift);
  } catch {
    return [];
  }
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function calcHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let m = eh * 60 + em - (sh * 60 + sm);
  if (m < 0) m += 1440;
  return m / 60;
}

/**
 * Save shifts to storage in compact format.
 */
export function saveShiftsToStorage(shifts: Shift[]): boolean {
  try {
    const compactShifts: ShiftCompact[] = shifts.map(compactShift);
    localStorage.setItem(STORAGE_SHIFTS, JSON.stringify(compactShifts));
    return true;
  } catch {
    return false;
  }
}

/** Prepends a shift and notifies listeners so the full tracker UI can resync. */
export function appendShiftToStorage(shift: Shift): boolean {
  try {
    const shifts = getShiftsFromStorage();
    shifts.unshift(shift);
    return saveShiftsToStorage(shifts);
  } catch {
    return false;
  }
}

interface ShiftPayment {
  id: number;
  type: string;
  periodKey: string;
  amount: number;
  date: string;
  label: string;
  walletTransactionId?: string;
}

export interface ReportOptions {
  showRate?: boolean;
  showPayments?: boolean;
  showNotes?: boolean;
}

function formatDateForReport(d: string) {
  const [y, mo, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(day, 10)} ${months[parseInt(mo, 10) - 1]} ${y}`;
}

function fmtHM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function generateTextReport(
  shifts: Shift[],
  payments: ShiftPayment[],
  rate: number,
  timeFormat: "12h" | "24h",
  currencySymbol: string,
  selectedIds?: number[],
  opts?: ReportOptions,
): string {
  const showRate = opts?.showRate !== false;
  const showPayments = opts?.showPayments !== false;
  const showNotes = opts?.showNotes !== false;

  const filtered = selectedIds?.length
    ? shifts.filter(s => selectedIds.includes(s.id))
    : shifts;

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const totalHours = sorted.reduce((s, sh) => s + sh.hours, 0);
  const totalEarned = showRate ? sorted.reduce((s, sh) => s + sh.hours * (sh.rate ?? rate), 0) : 0;
  const shiftIds = new Set(sorted.map(s => s.id));
  const totalPaid = showPayments
    ? payments
        .filter(p => {
          if (p.type === "shift") return shiftIds.has(Number(p.periodKey));
          return false;
        })
        .reduce((s, p) => s + p.amount, 0)
    : 0;

  const lines: string[] = [];
  const divider = "─".repeat(56);

  if (showPayments || showRate) {
    lines.push("╔══════════════════════════════════════════════════════╗");
    lines.push("║              SHIFT TRACKER REPORT                   ║");
    lines.push("╚══════════════════════════════════════════════════════╝");
  } else {
    lines.push("╔══════════════════════════════════════════════════════╗");
    lines.push("║              SHIFT LOG                              ║");
    lines.push("╚══════════════════════════════════════════════════════╝");
  }
  lines.push("");
  lines.push(`  Generated: ${formatDateForReport(new Date().toISOString().split("T")[0])}`);
  lines.push(`  Period:    ${selectedIds?.length ? "Selected entries" : "All shifts"}`);
  lines.push(`  Entries:   ${sorted.length} shift${sorted.length !== 1 ? "s" : ""}`);
  lines.push("");

  if (!sorted.length) {
    lines.push("  No shifts to report.");
    return lines.join("\n");
  }

  lines.push("SHIFT LOG");
  lines.push(divider);

  sorted.forEach((sh, i) => {
    const getRate = (s: Shift) => s.rate ?? rate;
    const tf = (t: string) => {
      if (!t || timeFormat === "24h") return t;
      const [h, m] = t.split(":").map(Number);
      const suffix = h >= 12 ? "PM" : "AM";
      return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
    };

    const tag = sh.institution ? ` [${sh.institution}]` : "";
    const ratePart = showRate ? `  │  ${currencySymbol}${(sh.hours * getRate(sh)).toFixed(2)}` : "";
    lines.push(
      `  ${String(i + 1).padStart(3)}. ${formatDateForReport(sh.date)}${tag}`
    );
    lines.push(
      `       ${tf(sh.start)} - ${tf(sh.end)}  │  ${fmtHM(sh.hours).padStart(7)}${ratePart}`
    );
    if (showNotes && sh.note) {
      lines.push(`       ${sh.note}`);
    }
    if (showRate && sh.rate != null && sh.rate !== rate) {
      lines.push(`       Rate: ${currencySymbol}${sh.rate.toFixed(2)}/hr (override)`);
    }
    lines.push("");
  });

  if (showPayments || showRate) {
    lines.push("SUMMARY");
    lines.push(divider);
    lines.push(`  Total shifts:    ${sorted.length}`);
    lines.push(`  Total hours:     ${fmtHM(totalHours)}`);
    if (showRate) {
      lines.push(`  Total earned:    ${currencySymbol}${totalEarned.toFixed(2)}`);
    }
    if (showPayments) {
      lines.push(`  Total paid:      ${currencySymbol}${totalPaid.toFixed(2)}`);
      lines.push(`  Balance owed:    ${currencySymbol}${Math.max(0, totalEarned - totalPaid).toFixed(2)}`);
    }
    lines.push("");
  }

  if (showRate) {
    const instMap = new Map<string, { count: number; hours: number; earned: number }>();
    for (const sh of sorted) {
      const key = sh.institution || "(no institution)";
      const prev = instMap.get(key) || { count: 0, hours: 0, earned: 0 };
      prev.count++;
      prev.hours += sh.hours;
      prev.earned += sh.hours * (sh.rate ?? rate);
      instMap.set(key, prev);
    }
    if (instMap.size > 0) {
      lines.push("BY INSTITUTION");
      lines.push(divider);
      for (const [name, stats] of instMap) {
        lines.push(
          `  ${name}: ${stats.count} shift${stats.count !== 1 ? "s" : ""}, ${fmtHM(stats.hours)}, ${currencySymbol}${stats.earned.toFixed(2)} earned`
        );
      }
      lines.push("");
      lines.push(divider);
    }
  }

  lines.push("  Generated by MyWallet Shift Tracker");

  return lines.join("\n");
}