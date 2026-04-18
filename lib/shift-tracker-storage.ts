/** 
 * Storage keys for shift tracker data.
 * Version bumped to v2 for field shortening optimization.
 */
export const STORAGE_SHIFTS = "mywallet_wt_shifts_v2";
export const STORAGE_RATE = "mywallet_wt_rate_v1";
export const STORAGE_TIME_FMT = "mywallet_wt_timefmt_v1";

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
 */
export interface Shift {
  id: number;
  date: string;
  start: string;
  end: string;
  note: string;
  hours: number;
  rate?: number;
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
  // Only include rate if it's set
  if (shift.rate !== undefined) {
    compact.r = shift.rate;
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