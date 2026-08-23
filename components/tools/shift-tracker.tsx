"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  Settings,
  Plus,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Clock,
  Search,
  ArrowUpDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogShiftDialog } from "@/components/tools/log-shift-dialog";
import { ExportDialog } from "@/components/tools/export-dialog";
import {
  STORAGE_RATE,
  STORAGE_TIME_FMT,
  STORAGE_PAY_TO_WALLET,
  STORAGE_META,
  type ShiftTrackerMeta,
  SHIFT_STORAGE_UPDATED_EVENT,
  type Shift,
  todayStr,
  getShiftsFromStorage,
  saveShiftsToStorage,
  generateTextReport,
} from "@/lib/shift-tracker-storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWalletData } from "@/contexts/wallet-data-context";
import { useTransactions } from "@/contexts/transactions-context";
import { useUser } from "@/contexts/user-context";
import { getCurrencySymbol } from "@/lib/currency";
import { cn, formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import type { Transaction } from "@/types/wallet";
import { Sheet, SheetContent, SheetTitle } from "../ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import {
  formatAppDate,
  formatAppMonthKey,
  getCalendarMonthKey,
} from "@/lib/app-calendar";

/** Dispatched by the main floating + button when the Shift tracker tab is active. */
export const SHIFT_TRACKER_OPEN_LOG_EVENT = "wallet-shift-tracker-open-log";

const STORAGE_PAYMENTS = "mywallet_wt_pay_v1";

type TimeFmt = "12h" | "24h";
type PeriodView = "day" | "week" | "month" | "all";
type StatView = "month" | "all";
type ShiftStatusFilter = "all" | "paid" | "owed";
type PaymentHistorySort = "date" | "amount";
type PaymentHistorySortOrder = "asc" | "desc";
type PaymentTypeFilter = "all-types" | ShiftPayment["type"];

interface ShiftPayment {
  id: number;
  type: PeriodView | "shift";
  periodKey: string;
  amount: number;
  date: string;
  label: string;
  walletTransactionId?: string;
}

function fh(h: number) {
  // Only remove .00 (whole numbers), keep .20, .02 etc.
  const formatted = h.toFixed(2).replace(/\.00$/, "");
  return `${formatted}h`;
}

function weekKey(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const f = (dt: Date) => dt.toISOString().split("T")[0];
  return `${f(mon)}__${f(sun)}`;
}

// Month names - short and full versions
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function fd(d: string, calendarSystem = "AD") {
  if (calendarSystem === "BS") return formatAppDate(d, "BS");
  const [y, mo, day] = d.split("-");
  return `${parseInt(day, 10)} ${MONTHS_SHORT[parseInt(mo, 10) - 1]} ${y}`;
}

function mname(m: string) {
  return MONTHS_FULL[parseInt(m, 10) - 1];
}

export function ShiftTracker() {
  const { addTransaction } = useTransactions();
  const { userProfile } = useUser();
  const { deleteTransaction, categories } = useWalletData();
  const isMobile = useIsMobile();

  const addIncome = useCallback(
    async (
      partial: Omit<Transaction, "id" | "timeEquivalent" | "createdAt">,
    ) => {
      return addTransaction({
        ...partial,
        type: "income",
      });
    },
    [addTransaction],
  );

  const incomeCategory = useMemo(() => {
    const incomeNames = categories
      .filter((c) => c.type === "income")
      .map((c) => c.name);
    if (incomeNames.includes("Salary")) return "Salary";
    if (incomeNames.includes("Freelance")) return "Freelance";
    if (incomeNames.includes("Side Hustle")) return "Side Hustle";
    return incomeNames[0] ?? "Salary";
  }, [categories]);

  const currencySymbol = getCurrencySymbol(
    userProfile?.currency ?? "USD",
    userProfile?.customCurrency,
  );
    const calendarSystem = useCalendarSystem();
  const monthKey = useCallback(
    (date: string) => getCalendarMonthKey(date, calendarSystem),
    [calendarSystem],
  );

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [payments, setPayments] = useState<ShiftPayment[]>([]);
  const [rateInput, setRateInput] = useState("12.20");
  const [timeFormat, setTimeFormat] = useState<TimeFmt>("12h");
  const [hydrated, setHydrated] = useState(false);

  const [statView, setStatView] = useState<StatView>("month");
  const [periodView, setPeriodView] = useState<PeriodView>("week");
  const [shiftStatusFilter, setShiftStatusFilter] =
    useState<ShiftStatusFilter>("all");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [logOpen, setLogOpen] = useState(false);
  const [editShift, setEditShift] = useState<Shift | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailShiftId, setDetailShiftId] = useState<number | null>(null);
  const [actionShiftId, setActionShiftId] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSelectedOnly, setExportSelectedOnly] = useState(false);

  const [selectedShifts, setSelectedShifts] = useState<Set<number>>(new Set());
  const [settingsRate, setSettingsRate] = useState("12.20");
  const [payToWallet, setPayToWallet] = useState(true);
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] =
    useState<PaymentTypeFilter>("all-types");
  const [paymentSortBy, setPaymentSortBy] =
    useState<PaymentHistorySort>("date");
  const [paymentSortOrder, setPaymentSortOrder] =
    useState<PaymentHistorySortOrder>("desc");
  const [paymentVisibleCount, setPaymentVisibleCount] = useState(7);
  const [showPaymentFilters, setShowPaymentFilters] = useState(false);
  const [paymentDateRange, setPaymentDateRange] = useState<
    DateRange | undefined
  >(undefined);

  const clearPaymentFilterSelection = useCallback(() => {
    setPaymentSearchTerm("");
    setPaymentTypeFilter("all-types");
    setPaymentSortBy("date");
    setPaymentSortOrder("desc");
    setPaymentDateRange(undefined);
    setPaymentVisibleCount(7);
  }, []);

  useEffect(() => {
    setPaymentVisibleCount(7);
  }, [
    paymentSearchTerm,
    paymentTypeFilter,
    paymentSortBy,
    paymentSortOrder,
    paymentDateRange,
  ]);

  const filteredPayments = useMemo(() => {
    return payments
      .filter((payment) => {
        const paymentDate = new Date(payment.date);
        const matchesDateRange =
          paymentDateRange?.from && paymentDateRange?.to
            ? paymentDate >= paymentDateRange.from &&
              paymentDate <= paymentDateRange.to
            : paymentDateRange?.from
              ? paymentDate >= paymentDateRange.from
              : paymentDateRange?.to
                ? paymentDate <= paymentDateRange.to
                : true;
        const search = paymentSearchTerm.trim().toLowerCase();
        const matchesSearch =
          !search ||
          payment.label.toLowerCase().includes(search) ||
          payment.type.toLowerCase().includes(search) ||
          payment.date.toLowerCase().includes(search);
        const matchesType =
          paymentTypeFilter === "all-types" ||
          payment.type === paymentTypeFilter;
        return matchesDateRange && matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (paymentSortBy === "amount") {
          return paymentSortOrder === "desc"
            ? b.amount - a.amount
            : a.amount - b.amount;
        }
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return paymentSortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [
    payments,
    paymentSearchTerm,
    paymentTypeFilter,
    paymentSortBy,
    paymentSortOrder,
    paymentDateRange,
  ]);

  const visiblePayments = filteredPayments.slice(0, paymentVisibleCount);

  useEffect(() => {
    try {
      const shifts = getShiftsFromStorage();
      const p = localStorage.getItem(STORAGE_PAYMENTS);
      if (shifts.length > 0) setShifts(shifts);
      if (p) setPayments(JSON.parse(p));

      const metaRaw = localStorage.getItem(STORAGE_META);
      if (metaRaw) {
        const meta: ShiftTrackerMeta = JSON.parse(metaRaw);
        setRateInput(meta.rate);
        if (meta.timeFormat === "12h" || meta.timeFormat === "24h") setTimeFormat(meta.timeFormat);
        if (typeof meta.payToWallet === "boolean") setPayToWallet(meta.payToWallet);
      } else {
        // fallback to old individual keys
        const r = localStorage.getItem(STORAGE_RATE);
        const tf = localStorage.getItem(STORAGE_TIME_FMT) as TimeFmt | null;
        const pw = localStorage.getItem(STORAGE_PAY_TO_WALLET);
        if (r) setRateInput(r);
        if (tf === "12h" || tf === "24h") setTimeFormat(tf);
        if (pw !== null) setPayToWallet(pw === "true");
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const getRate = useCallback(() => {
    const v = parseFloat(rateInput);
    return Number.isFinite(v) ? v : 0;
  }, [rateInput]);

  const getShiftRate = useCallback(
    (s: Shift) => (s.rate != null ? s.rate : getRate()),
    [getRate],
  );

  const saveStorage = useCallback(() => {
    saveShiftsToStorage(shifts);
    localStorage.setItem(STORAGE_PAYMENTS, JSON.stringify(payments));
    const meta: ShiftTrackerMeta = { rate: rateInput, timeFormat, payToWallet };
    localStorage.setItem(STORAGE_META, JSON.stringify(meta));
    // clean up old individual keys after migration
    localStorage.removeItem(STORAGE_RATE);
    localStorage.removeItem(STORAGE_TIME_FMT);
    localStorage.removeItem(STORAGE_PAY_TO_WALLET);
  }, [shifts, payments, rateInput, timeFormat, payToWallet]);

  useEffect(() => {
    if (!hydrated) return;
    saveStorage();
  }, [hydrated, saveStorage]);

  useEffect(() => {
    const onExternal = () => {
      try {
        const shifts = getShiftsFromStorage();
        if (shifts.length > 0) setShifts(shifts);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(SHIFT_STORAGE_UPDATED_EVENT, onExternal);
    return () =>
      window.removeEventListener(SHIFT_STORAGE_UPDATED_EVENT, onExternal);
  }, []);

  const formatTimeValue = useCallback(
    (t: string) => {
      if (!t) return "";
      const [hourStr, minuteStr] = t.split(":");
      const hour = parseInt(hourStr, 10);
      if (timeFormat === "24h") return `${hourStr}:${minuteStr}`;
      const suffix = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minuteStr} ${suffix}`;
    },
    [timeFormat],
  );

  const formatShiftTimeRange = useCallback(
    (s: Shift) => {
      if (!s.start || !s.end) return "";
      return `${formatTimeValue(s.start)} - ${formatTimeValue(s.end)}`;
    },
    [formatTimeValue],
  );

  const paidForShift = useCallback(
    (id: number) => {
      const shift = shifts.find((s) => s.id === id);
      if (!shift) return 0;
      return payments.reduce((sum, payment) => {
        let coveredShifts: Shift[];
        switch (payment.type) {
          case "shift":
            coveredShifts = shifts.filter((s) => String(s.id) === String(payment.periodKey));
            break;
          case "day":
            coveredShifts = shifts.filter((s) => s.date === payment.periodKey);
            break;
          case "week":
            coveredShifts = shifts.filter((s) => weekKey(s.date) === payment.periodKey);
            break;
          case "month":
            coveredShifts = shifts.filter((s) => monthKey(s.date) === payment.periodKey);
            break;
          case "all":
            coveredShifts = shifts;
            break;
          default:
            coveredShifts = [];
        }
        if (!coveredShifts.length) return sum;
        const coveredEarn = coveredShifts.reduce(
          (acc, s) => acc + s.hours * getShiftRate(s), 0,
        );
        if (coveredEarn <= 0) return sum;
        const matchedEarn = coveredShifts
          .filter((s) => s.id === id)
          .reduce((acc, s) => acc + s.hours * getShiftRate(s), 0);
        if (matchedEarn <= 0) return sum;
        return sum + payment.amount * (matchedEarn / coveredEarn);
      }, 0);
    },
    [payments, shifts, getShiftRate, weekKey, monthKey],
  );

  const shiftEarned = useCallback(
    (s: Shift) => s.hours * getShiftRate(s),
    [getShiftRate],
  );

  const shiftOwed = useCallback(
    (s: Shift) => Math.max(0, shiftEarned(s) - paidForShift(s.id)),
    [shiftEarned, paidForShift],
  );

  const shiftIsPaid = useCallback(
    (s: Shift) =>
      paidForShift(s.id) >= shiftEarned(s) - 0.005 && shiftEarned(s) > 0,
    [paidForShift, shiftEarned],
  );

  const shiftPaymentLabel = (s: Shift) => {
    const main = s.note || formatShiftTimeRange(s);
    return `${fd(s.date, calendarSystem)} | ${main}`;
  };

  const getCoveredShiftsForPayment = useCallback(
    (payment: ShiftPayment) => {
      switch (payment.type) {
        case "shift":
          return shifts.filter(
            (shift) => String(shift.id) === String(payment.periodKey),
          );
        case "day":
          return shifts.filter((shift) => shift.date === payment.periodKey);
        case "week":
          return shifts.filter(
            (shift) => weekKey(shift.date) === payment.periodKey,
          );
        case "month":
          return shifts.filter(
            (shift) => monthKey(shift.date) === payment.periodKey,
          );
        case "all":
          return shifts;
        default:
          return [];
      }
    },
    [shifts],
  );

  const paidForPeriod = useCallback(
    (key: string, type: PeriodView, sourceShifts: Shift[] = shifts) => {
      const targetShifts = sourceShifts.filter((shift) => {
        if (type === "day") return shift.date === key;
        if (type === "week") return weekKey(shift.date) === key;
        if (type === "month") return monthKey(shift.date) === key;
        return true;
      });

      const targetShiftIds = new Set(
        targetShifts.map((shift) => String(shift.id)),
      );

      return payments.reduce((sum, payment) => {
        const coveredShifts = getCoveredShiftsForPayment(payment);
        if (!coveredShifts.length) return sum;

        const coveredEarn = coveredShifts.reduce(
          (acc, shift) => acc + shift.hours * getShiftRate(shift),
          0,
        );
        if (coveredEarn <= 0) return sum;

        const matchedEarn = coveredShifts
          .filter((shift) => targetShiftIds.has(String(shift.id)))
          .reduce((acc, shift) => acc + shift.hours * getShiftRate(shift), 0);

        if (matchedEarn <= 0) return sum;
        return sum + payment.amount * (matchedEarn / coveredEarn);
      }, 0);
    },
    [payments, shifts, getCoveredShiftsForPayment, getShiftRate, monthKey],
  );

  const recordIncomeForPayment = async (
    amount: number,
    label: string,
    paymentDate: string,
  ) => {
    const res = await addIncome({
      type: "income",
      amount,
      description: `Shift pay: ${label}`,
      category: incomeCategory,
      date: paymentDate,
      tags: ["shift-tracker"],
    });
    const txId =
      res &&
      typeof res === "object" &&
      "transaction" in res &&
      res.transaction &&
      typeof (res.transaction as Transaction).id === "string"
        ? (res.transaction as Transaction).id
        : undefined;
    return txId;
  };

  const markPaid = async (
    key: string,
    type: PeriodView,
    label: string,
    amount: number,
  ) => {
    const payDate = todayStr();
    let walletTransactionId: string | undefined;
    if (payToWallet) {
      try {
        walletTransactionId = await recordIncomeForPayment(
          amount,
          label,
          payDate,
        );
      } catch {
        toast.error("Could not add income to your wallet.");
        return;
      }
    }
    const payment: ShiftPayment = {
      id: Date.now(),
      type,
      periodKey: key,
      amount: parseFloat(amount.toFixed(2)),
      date: payDate,
      label,
      walletTransactionId,
    };
    setPayments((prev) => [payment, ...prev]);
    toast.success("Marked paid" + (payToWallet ? " - income added to transactions" : ""));
  };

  const markShiftPaid = async (id: number) => {
    const shift = shifts.find((s) => s.id === id);
    if (!shift) return;
    const owed = shiftOwed(shift);
    if (owed <= 0) return;
    const payDate = todayStr();
    let walletTransactionId: string | undefined;
    if (payToWallet) {
      try {
        walletTransactionId = await recordIncomeForPayment(
          owed,
          shiftPaymentLabel(shift),
          payDate,
        );
      } catch {
        toast.error("Could not add income to your wallet.");
        return;
      }
    }
    setPayments((prev) => [
      {
        id: Date.now(),
        type: "shift",
        periodKey: String(id),
        amount: parseFloat(owed.toFixed(2)),
        date: payDate,
        label: shiftPaymentLabel(shift),
        walletTransactionId,
      },
      ...prev,
    ]);
    toast.success("Shift paid" + (payToWallet ? " - income added to transactions" : ""));
  };

  const undoPaid = async (paymentId: number) => {
    const p = payments.find((x) => x.id === paymentId);
    if (p?.walletTransactionId) {
      try {
        await deleteTransaction(p.walletTransactionId);
      } catch {
        toast.error("Could not remove linked transaction; check Transactions.");
      }
    }
    setPayments((prev) => prev.filter((x) => x.id !== paymentId));
    toast.message("Payment undone");
  };

  const removeShift = (id: number) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    setPayments((prev) =>
      prev.filter(
        (p) => !(p.type === "shift" && String(p.periodKey) === String(id)),
      ),
    );
  };

  const exportData = () => {
    const data = {
      shifts,
      payments,
      rate: getRate(),
      timeFormat,
      version: "mywallet-1",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift_tracker_backup_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTextReport = (selectedOnly?: boolean) => {
    let selectedIds = selectedOnly && selectedShifts.size > 0
      ? Array.from(selectedShifts)
      : undefined;
    // When institution filter is active, restrict export to matching shifts
    if (institutionFilter !== "all") {
      const instIds = shifts
        .filter((s) => s.institution === institutionFilter)
        .map((s) => s.id);
      selectedIds = selectedIds
        ? selectedIds.filter((id) => instIds.includes(id))
        : instIds;
    }
    const report = generateTextReport(
      shifts,
      payments,
      getRate(),
      timeFormat,
      currencySymbol,
      selectedIds?.length ? selectedIds : undefined,
    );
    const suffix = selectedIds
      ? `_${institutionFilter !== "all" ? institutionFilter.replace(/\s+/g, "_").toLowerCase() : "selected"}`
      : "";
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift_report_${todayStr()}${suffix}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedIds?.length || shifts.length} shifts as text`);
  };

  const toggleSelectShift = (id: number) => {
    setSelectedShifts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedShifts(new Set());

  const handleBulkPay = async () => {
    const unpaid = shifts.filter((s) => selectedShifts.has(s.id) && shiftOwed(s) > 0);
    if (!unpaid.length) {
      toast.info("No unpaid shifts selected.");
      return;
    }
    let paid = 0;
    for (const shift of unpaid) {
      try {
        await markShiftPaid(shift.id);
        paid++;
      } catch { /* skip failed */ }
    }
    clearSelection();
    toast.success(`Paid ${paid} of ${unpaid.length} selected shift${unpaid.length > 1 ? "s" : ""}.`);
  };

  const importData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(String(ev.target?.result));
        if (data.shifts) setShifts(data.shifts);
        if (data.payments) setPayments(data.payments);
        if (data.rate != null) setRateInput(String(data.rate));
        if (data.timeFormat === "12h" || data.timeFormat === "24h")
          setTimeFormat(data.timeFormat);
        toast.success("Backup imported");
      } catch (err) {
        toast.error(
          `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const uniqueInstitutions = useMemo(() => {
    const set = new Set<string>();
    shifts.forEach((s) => { if (s.institution) set.add(s.institution); });
    return Array.from(set).sort();
  }, [shifts]);

  /* Stats */
  const thisMonth = monthKey(todayStr());
  const scopedShifts = useMemo(
    () => {
      let filtered = statView === "month"
        ? shifts.filter((s) => monthKey(s.date) === thisMonth)
        : shifts;
      if (institutionFilter !== "all") {
        filtered = filtered.filter((s) => s.institution === institutionFilter);
      }
      return filtered;
    },
    [shifts, statView, thisMonth, monthKey, institutionFilter],
  );
  /* Apply institution filter to stats */
  const instFilteredShifts = useMemo(
    () => institutionFilter === "all" ? shifts : shifts.filter((s) => s.institution === institutionFilter),
    [shifts, institutionFilter],
  );
  const instFilteredIds = useMemo(() => new Set(instFilteredShifts.map((s) => s.id)), [instFilteredShifts]);

  let atE = 0,
    moE = 0,
    atH = 0,
    moH = 0;
  instFilteredShifts.forEach((s) => {
    atH += s.hours;
    const r = getShiftRate(s);
    atE += s.hours * r;
    if (monthKey(s.date) === thisMonth) {
      moH += s.hours;
      moE += s.hours * r;
    }
  });
  let atP = 0;
  payments.forEach((p) => {
    if (p.type === "shift" && !instFilteredIds.has(Number(p.periodKey))) return;
    atP += p.amount;
  });

  let moP = 0;
  payments.forEach((p) => {
    if (p.type === "shift" && !instFilteredIds.has(Number(p.periodKey))) return;
    if (p.type === "month" && p.periodKey === thisMonth) {
      moP += p.amount;
      return;
    }
    if (p.type === "week") {
      const [a, b] = p.periodKey.split("__");
      if (monthKey(a) === thisMonth || monthKey(b) === thisMonth) {
        const weekShifts = instFilteredShifts.filter(
          (s) => weekKey(s.date) === p.periodKey,
        );
        const weekEarn = weekShifts.reduce(
          (acc, s) => acc + s.hours * getShiftRate(s),
          0,
        );
        const moWeekEarn = weekShifts
          .filter((s) => monthKey(s.date) === thisMonth)
          .reduce((acc, s) => acc + s.hours * getShiftRate(s), 0);
        if (weekEarn > 0) moP += p.amount * (moWeekEarn / weekEarn);
      }
      return;
    }
    if (p.type === "day") {
      const pMonth = p.periodKey ? monthKey(p.periodKey) : "";
      if (pMonth === thisMonth) moP += p.amount;
      return;
    }
  });

  const togglePeriod = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  };

  const openLog = useCallback(() => {
    setLogOpen(true);
  }, []);

  useEffect(() => {
    const onOpen = () => openLog();
    window.addEventListener(SHIFT_TRACKER_OPEN_LOG_EVENT, onOpen);
    return () =>
      window.removeEventListener(SHIFT_TRACKER_OPEN_LOG_EVENT, onOpen);
  }, [openLog]);

  const detailShift = detailShiftId
    ? shifts.find((s) => s.id === detailShiftId)
    : null;
  const actionShift = actionShiftId
    ? shifts.find((s) => s.id === actionShiftId)
    : null;

  return (
    <div className="space-y-6 text-[15px] leading-relaxed">
      <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-4 justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 min-w-0">
          <Clock className="w-5 h-5 shrink-0 text-primary" />
          <span className="truncate">Shift tracker</span>
        </h3>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{currencySymbol}</span>
            <Input
              type="number"
              min={0}
              step={0.5}
              className="h-7 w-12 sm:w-14 border-0 bg-transparent p-0 text-right font-mono text-sm font-medium text-foreground shadow-none focus-visible:ring-0"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              aria-label="Hourly rate"
            />
            <span className="hidden sm:inline">/ hr</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => {
              setSettingsRate(rateInput);
              setSettingsOpen(true);
            }}
            aria-label="Shift tracker settings"
          >
            <Settings className="h-[18px] w-[18px]" />
          </Button>
          <Button
            type="button"
            onClick={openLog}
            className="flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add shift</span>
          </Button>
        </div>
      </div>

      <Card className="gap-3 py-3 shadow-sm sm:gap-4 sm:py-5">
        <CardHeader className="px-3 pb-0 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Summary</CardTitle>
            </div>
            <div className="flex w-fit gap-0.5 rounded-lg border bg-muted/50 p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  statView === "month"
                    ? "border border-border bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
                onClick={() => setStatView("month")}
              >
                Month
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  statView === "all"
                    ? "border border-border bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
                onClick={() => setStatView("all")}
              >
                All time
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pt-0 sm:px-6">
          <div
            className={cn(
              "grid grid-cols-2 gap-2 sm:grid-cols-4",
              statView === "month" ? "" : "hidden",
            )}
          >
            <StatCell label="Hours" value={fh(moH)} />
            <StatCell
              label="Earned"
              value={formatMoney(moE, currencySymbol)}
              className="text-emerald-600"
            />
            <StatCell
              label="Received"
              value={formatMoney(moP, currencySymbol)}
              className="text-emerald-600"
            />
            <StatCell
              label="Owed"
              value={formatMoney(Math.max(0, moE - moP), currencySymbol)}
              className="text-amber-600"
            />
          </div>
          <div
            className={cn(
              "grid grid-cols-2 gap-2 sm:grid-cols-4",
              statView === "all" ? "" : "hidden",
            )}
          >
            <StatCell label="Hours" value={fh(atH)} />
            <StatCell
              label="Earned"
              value={formatMoney(atE)}
              className="text-emerald-600"
            />
            <StatCell
              label="Received"
              value={formatMoney(atP)}
              className="text-emerald-600"
            />
            <StatCell
              label="Owed"
              value={formatMoney(Math.max(0, atE - atP))}
              className="text-amber-600"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-sm">
        <CardHeader className="px-4 sm:px-6 pb-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-base">
                Shifts &amp; pay status
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={shiftStatusFilter}
                  onValueChange={(value) =>
                    setShiftStatusFilter(value as ShiftStatusFilter)
                  }
                >
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="owed">Owed</SelectItem>
                  </SelectContent>
                </Select>
                {uniqueInstitutions.length > 0 && (
                  <Select
                    value={institutionFilter}
                    onValueChange={setInstitutionFilter}
                  >
                    <SelectTrigger className="h-9 w-[160px]">
                      <SelectValue placeholder="Filter institution" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All institutions</SelectItem>
                      {uniqueInstitutions.map((inst) => (
                        <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-0.5 rounded-lg border bg-muted/50 p-0.5">
              {(
                [
                  ["day", "Day"],
                  ["week", "Week"],
                  ["month", "Month"],
                  ["all", "All"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    periodView === v
                      ? "border border-border bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setPeriodView(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pt-0">
          {selectedShifts.size > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2.5 text-sm">
              <span className="mr-1 font-medium">{selectedShifts.size} selected</span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 text-xs"
                  onClick={handleBulkPay}
                >
                  Make paid
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                onClick={() => { setExportSelectedOnly(true); setExportOpen(true); }}
              >
                Export
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={clearSelection}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
          <PeriodsBody
            shifts={scopedShifts}
            periodView={periodView}
            statusFilter={shiftStatusFilter}
            expanded={expanded}
            togglePeriod={togglePeriod}
            getShiftRate={getShiftRate}
            paidForPeriod={paidForPeriod}
            markPaid={markPaid}
            fh={fh}
            fd={fd}
            formatMoney={formatMoney}
            formatShiftTimeRange={formatShiftTimeRange}
            shiftIsPaid={shiftIsPaid}
            weekKey={weekKey}
            mname={mname}
            calendarSystem={calendarSystem}
            monthKey={monthKey}
            onOpenDetails={setDetailShiftId}
            onOpenActions={setActionShiftId}
            currencySymbol={currencySymbol}
            isMobile={isMobile}
            selectedShifts={selectedShifts}
            onToggleSelect={toggleSelectShift}
          />
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-sm">
        <CardHeader className="px-4 sm:px-6 pb-0">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Payment history</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentFilters((prev) => !prev)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {showPaymentFilters ? "Hide Details" : "View Details"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pt-0">
          {!payments.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payments yet - use &quot;Mark paid&quot; on a period or shift.
              Each payment adds an income transaction to your wallet.
            </p>
          ) : (
            <div className="space-y-3">
              {showPaymentFilters && (
                <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={paymentSearchTerm}
                      onChange={(e) => setPaymentSearchTerm(e.target.value)}
                      placeholder="Search payments..."
                      className="pl-10"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`${
                            isMobile ? "w-full" : "w-[220px]"
                          } justify-start text-left font-normal`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {paymentDateRange?.from ? (
                            paymentDateRange?.to ? (
                              <>
                                {formatAppDate(paymentDateRange.from, calendarSystem)} -{" "}
                                {formatAppDate(paymentDateRange.to, calendarSystem)}
                              </>
                            ) : (
                              formatAppDate(paymentDateRange.from, calendarSystem)
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className={`${
                          isMobile ? "w-full max-w-[300px]" : "w-[300px]"
                        } p-0`}
                        align="start"
                      >
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={paymentDateRange?.from}
                          selected={paymentDateRange}
                          onSelect={(range) => setPaymentDateRange(range)}
                          numberOfMonths={1}
                          className="w-full rounded-md border-0"
                        />
                        <div className="border-t border-border p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentDateRange(undefined)}
                            className="w-full"
                          >
                            Clear dates
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Select
                      value={paymentTypeFilter}
                      onValueChange={(value) =>
                        setPaymentTypeFilter(value as PaymentTypeFilter)
                      }
                    >
                      <SelectTrigger className="sm:w-[180px]">
                        <SelectValue placeholder="All payment types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-types">
                          All payment types
                        </SelectItem>
                        <SelectItem value="shift">Shift</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="all">All period payouts</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      className="justify-between sm:w-[180px]"
                      onClick={() =>
                        setPaymentSortBy((prev) =>
                          prev === "date" ? "amount" : "date",
                        )
                      }
                    >
                      <span>
                        Sort by {paymentSortBy === "date" ? "date" : "amount"}
                      </span>
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="sm:w-[150px]"
                      onClick={() =>
                        setPaymentSortOrder((prev) =>
                          prev === "desc" ? "asc" : "desc",
                        )
                      }
                    >
                      {paymentSortOrder === "desc"
                        ? "Newest first"
                        : "Oldest first"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="sm:w-[140px]"
                      onClick={clearPaymentFilterSelection}
                    >
                      Clear selection
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {filteredPayments.length === payments.length
                  ? "Showing your most recent payment records."
                  : `Showing ${filteredPayments.length} matching payment records.`}
              </p>
              <div className="divide-y rounded-lg border bg-muted/20">
                {visiblePayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {p.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fd(p.date, calendarSystem)} · {p.type}
                        {p.walletTransactionId
                          ? " · linked to transaction"
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-emerald-600">
                        {formatMoney(p.amount, currencySymbol)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                        onClick={() => undoPaid(p.id)}
                      >
                        Undo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {!visiblePayments.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {paymentSearchTerm ||
                  paymentTypeFilter !== "all-types" ||
                  paymentDateRange?.from ||
                  paymentDateRange?.to
                    ? "No payment history matches your current filters."
                    : "No payment history found."}
                </p>
              )}
              {(paymentVisibleCount < filteredPayments.length ||
                paymentVisibleCount > 7) && (
                <div className="flex flex-wrap gap-2">
                  {paymentVisibleCount < filteredPayments.length && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentVisibleCount((prev) => prev + 7)}
                    >
                      Show more
                    </Button>
                  )}
                  {paymentVisibleCount > 7 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaymentVisibleCount(7)}
                    >
                      Show less
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <LogShiftDialog
        open={logOpen}
        onOpenChange={(open) => {
          setLogOpen(open);
          if (!open) setEditShift(undefined);
        }}
        defaultRateInput={rateInput}
        initialShift={editShift}
        institutions={uniqueInstitutions}
        onSave={(shift) => {
          if (editShift) {
            // Update existing shift
            setShifts((prev) =>
              prev.map((s) =>
                s.id === editShift.id ? { ...shift, id: editShift.id } : s,
              ),
            );
            toast.success("Shift updated");
            return true;
          } else {
            // Add new shift
            setShifts((prev) => [shift, ...prev]);
            toast.success("Shift saved");
            return true;
          }
        }}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={(open) => { setExportOpen(open); if (!open) setExportSelectedOnly(false); }}
        shifts={exportSelectedOnly ? shifts.filter((s) => selectedShifts.has(s.id)) : shifts}
        payments={payments}
        rate={getRate()}
        timeFormat={timeFormat}
        currencySymbol={currencySymbol}
        calendarSystem={calendarSystem}
      />

      {/* Settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-md gap-0 p-0 overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-300",
          )}
        >
          <DialogHeader className="p-6 pb-4 space-y-2 border-b border-border/60 bg-muted/20 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Settings className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Shift Tracker Settings
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-snug hidden sm:block">
                  Adjust your hourly rate and time format preferences for shift
                  tracking.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5 max-h-[min(60vh,480px)] overflow-y-auto overscroll-contain">
            <div className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
                  Hourly rate ({currencySymbol}/hr)
                </Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    className="h-11 rounded-xl border-muted/60 font-mono"
                    type="number"
                    step={0.5}
                    value={settingsRate}
                    onChange={(e) => setSettingsRate(e.target.value)}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Default rate used for new shifts.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
                    Time format
                  </Label>
                  <div className="mt-2 flex w-full gap-0.5 rounded-xl border bg-muted/30 p-1">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-lg px-1 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                        timeFormat === "12h"
                          ? "bg-background text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setTimeFormat("12h")}
                    >
                      12h
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-lg px-1 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                        timeFormat === "24h"
                          ? "bg-background text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setTimeFormat("24h")}
                    >
                      24h
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
                    Payout
                  </Label>
                  <div className="mt-2 flex w-full gap-0.5 rounded-xl border bg-muted/30 p-1">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-lg px-1 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                        payToWallet
                          ? "bg-background text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setPayToWallet(true)}
                    >
                      Add to wallet
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-lg px-1 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                        !payToWallet
                          ? "bg-background text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setPayToWallet(false)}
                    >
                      None
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
                  Export
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="default"
                    className="h-11 rounded-xl font-medium"
                    onClick={() => setExportOpen(true)}
                  >
                    Export
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-muted/60 font-medium"
                    onClick={() => exportData()}
                  >
                    Full backup
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-muted/60 font-medium"
                    onClick={() =>
                      document.getElementById("shift-import")?.click()
                    }
                  >
                    Import backup
                  </Button>
                  <input
                    id="shift-import"
                    type="file"
                    title="np"
                    accept=".json"
                    className="hidden"
                    onChange={importData}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shift details */}
      <Dialog
        open={!!detailShift}
        onOpenChange={(o) => !o && setDetailShiftId(null)}
      >
        <DialogContent
          aria-describedby={undefined}
          className={cn(
            "sm:max-w-sm gap-0 p-0 overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-300",
          )}
        >
          {detailShift && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 pl-5 pr-12 pt-5 pb-3 border-b border-border/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base font-semibold leading-tight">
                    Shift
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fd(detailShift.date, calendarSystem)}
                  </p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  shiftIsPaid(detailShift)
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                )}>
                  {shiftIsPaid(detailShift) ? "Paid" : "Owed"}
                </span>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                {/* Time row */}
                <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3.5 py-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium tabular-nums">{formatTimeValue(detailShift.start)}</span>
                    <span className="text-muted-foreground/40">-</span>
                    <span className="font-medium tabular-nums">{formatTimeValue(detailShift.end)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">{fh(detailShift.hours)}</span>
                    {detailShift.institution && (
                      <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {detailShift.institution}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment card */}
                <div className="rounded-lg border bg-card px-3.5 py-3 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(getShiftRate(detailShift), currencySymbol)}/hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Earned</span>
                    <span className="font-semibold tabular-nums text-emerald-600">
                      {formatMoney(detailShift.hours * getShiftRate(detailShift), currencySymbol)}
                    </span>
                  </div>
                  <div className="h-px bg-border/60" />
                  {shiftOwed(detailShift) > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Still owed</span>
                      <span className="font-semibold tabular-nums text-amber-600">
                        {formatMoney(shiftOwed(detailShift), currencySymbol)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-600 font-medium">Fully paid</span>
                      {paidForShift(detailShift.id) > 0 && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          +{formatMoney(paidForShift(detailShift.id), currencySymbol)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Note */}
                {detailShift.note && (
                  <div className="rounded-lg bg-muted/30 px-3.5 py-2.5">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {detailShift.note}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 rounded-xl text-sm font-medium"
                    onClick={() => {
                      setEditShift(detailShift);
                      setLogOpen(true);
                      setDetailShiftId(null);
                    }}
                  >
                    Edit
                  </Button>
                  {shiftOwed(detailShift) > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 h-10 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        markShiftPaid(detailShift.id);
                        setDetailShiftId(null);
                      }}
                    >
                      Mark paid
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex-1 h-10 rounded-xl text-sm font-medium"
                      disabled
                    >
                      Fully paid
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift actions */}
      <Sheet
        open={!!actionShift}
        onOpenChange={(o) => !o && setActionShiftId(null)}
      >
        <SheetContent
          side="bottom"
          className="sm:max-w-md mx-auto w-full rounded-t-2xl p-0 gap-0"
        >
          <div className="border-b border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MoreHorizontal className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg font-semibold">
                  Shift actions
                </SheetTitle>
                {actionShift && (
                  <p className="text-sm text-muted-foreground">
                    {fd(actionShift.date, calendarSystem)} · {fh(actionShift.hours)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {actionShift && (
            <div className="p-4 space-y-3">
              {shiftOwed(actionShift) > 0 ? (
                <Button
                  type="button"
                  className="w-full h-12 rounded-xl font-medium bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 shadow-sm"
                  onClick={async () => {
                    await markShiftPaid(actionShift.id);
                    setActionShiftId(null);
                  }}
                >
                  <span className="flex items-center gap-2">
                    Make paid
                    <span className="text-xs opacity-80">
                      (+{formatMoney(shiftOwed(actionShift), currencySymbol)})
                    </span>
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full h-12 rounded-xl font-medium"
                  variant="secondary"
                  disabled
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500 w-2 h-2" />
                    Already paid
                  </span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl font-medium border-muted/60"
                onClick={() => {
                  setEditShift(actionShift);
                  setLogOpen(true);
                  setActionShiftId(null);
                }}
              >
                Edit shift
              </Button>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-medium border-muted/60"
                  onClick={() => {
                    if (confirm("Remove this shift?")) {
                      removeShift(actionShift.id);
                      setActionShiftId(null);
                    }
                  }}
                >
                  Remove shift
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-medium border-muted/60"
                  onClick={() => setActionShiftId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border bg-background px-1.5 py-2 text-center sm:px-2 sm:py-3">
      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:mb-1 sm:text-[11px]">
        {label}
      </div>
      <div className={cn("font-mono text-base font-medium sm:text-lg", className)}>
        {value}
      </div>
    </div>
  );
}

function DetailItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("font-mono text-sm", className)}>{value}</div>
    </div>
  );
}

function PeriodsBody({
  shifts,
  periodView,
  statusFilter,
  expanded,
  togglePeriod,
  getShiftRate,
  paidForPeriod,
  markPaid,
  fh,
  fd,
  formatMoney,
  formatShiftTimeRange,
  shiftIsPaid,
  weekKey,
  mname,
  calendarSystem,
  monthKey,
  onOpenDetails,
  onOpenActions,
  currencySymbol,
  isMobile,
  selectedShifts,
  onToggleSelect,
}: {
  shifts: Shift[];
  periodView: PeriodView;
  statusFilter: ShiftStatusFilter;
  expanded: Record<string, boolean>;
  togglePeriod: (id: string) => void;
  getShiftRate: (s: Shift) => number;
  paidForPeriod: (
    key: string,
    type: PeriodView,
    sourceShifts?: Shift[],
  ) => number;
  markPaid: (
    key: string,
    type: PeriodView,
    label: string,
    amount: number,
  ) => void;
  fh: (h: number) => string;
  fd: (d: string, calendarSystem?: "AD" | "BS") => string;
  formatMoney: (n: number, symbol?: string) => string;
  formatShiftTimeRange: (s: Shift) => string;
  shiftIsPaid: (s: Shift) => boolean;
  weekKey: (d: string) => string;
  mname: (m: string) => string;
  calendarSystem: "AD" | "BS";
  monthKey: (date: string) => string;
  onOpenDetails: (id: number) => void;
  onOpenActions: (id: number) => void;
  currencySymbol: string;
  isMobile: boolean;
  selectedShifts: Set<number>;
  onToggleSelect: (id: number) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 7;

  useEffect(() => {
    setPage(1);
  }, [periodView, statusFilter, shifts.length]);

  if (!shifts.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No shifts yet - tap + to log your first shift.
      </p>
    );
  }

  const sortShiftsLatestFirst = (items: Shift[]) =>
    [...items].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id - a.id;
    });

  const matchesShiftStatus = (isPaid: boolean, owedAmount = 0) => {
    if (statusFilter === "paid") return isPaid;
    if (statusFilter === "owed") return owedAmount > 0 || !isPaid;
    return true;
  };

  if (periodView === "all") {
    const filteredAllShifts = sortShiftsLatestFirst(shifts).filter((shift) => {
      const earned = shift.hours * getShiftRate(shift);
      const owed = Math.max(0, earned - paidForPeriod("all", "all", [shift]));
      return matchesShiftStatus(shiftIsPaid(shift), owed);
    });
    const totalPages = Math.max(
      1,
      Math.ceil(filteredAllShifts.length / pageSize),
    );
    const currentPage = Math.min(page, totalPages);
    const paginatedShifts = filteredAllShifts.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    );

    if (!filteredAllShifts.length) {
      return (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No shifts match the selected status filter.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {isMobile ? (
          <div className="space-y-2">
            {paginatedShifts.map((s) => {
              const earned = s.hours * getShiftRate(s);
              return (
                <div
                  key={s.id}
                  className="rounded-xl border bg-background p-3.5 cursor-pointer active:bg-muted/40 transition-colors"
                  onClick={() => onOpenDetails(s.id)}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        selectedShifts.has(s.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50",
                      )}
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(s.id); }}
                    >
                      {selectedShifts.has(s.id) && (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{fd(s.date, calendarSystem)}</span>
                        <span className="font-mono text-sm text-emerald-600">
                          {formatMoney(earned, currencySymbol)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-mono">{fh(s.hours)} @ {formatMoney(getShiftRate(s), currencySymbol)}/hr</span>
                        {s.institution && (
                          <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {s.institution}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full border"
                      onClick={(e) => { e.stopPropagation(); onOpenActions(s.id); }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border px-1">
            <table className="w-full min-w-[600px] table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-12 px-3 py-2.5">
                    <button
                      type="button"
                      className="flex h-5 w-5 items-center justify-center rounded border border-border hover:border-primary/50"
                      onClick={() => {
                        const allSel = paginatedShifts.every(s => selectedShifts.has(s.id));
                        paginatedShifts.forEach(s => {
                          if (allSel && selectedShifts.has(s.id)) onToggleSelect(s.id);
                          else if (!allSel && !selectedShifts.has(s.id)) onToggleSelect(s.id);
                        });
                      }}
                    >
                      {paginatedShifts.length > 0 && paginatedShifts.every(s => selectedShifts.has(s.id)) && (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Note / time</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Hours</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">Earned</th>
                  <th className="w-14 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {paginatedShifts.map((s) => (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/40",
                      selectedShifts.has(s.id) && "bg-primary/5",
                    )}
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <button
                        type="button"
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                          selectedShifts.has(s.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50",
                        )}
                        onClick={() => onToggleSelect(s.id)}
                      >
                        {selectedShifts.has(s.id) && (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 align-middle">{fd(s.date, calendarSystem)}</td>
                    <td className="px-3 py-2 align-middle">
                      <button
                        type="button"
                        className="block w-full text-left hover:text-primary"
                        onClick={() => onOpenDetails(s.id)}
                      >
                        {s.note || formatShiftTimeRange(s)}
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {s.note ? formatShiftTimeRange(s) : "Tap for details"}
                        </span>
                      </button>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {shiftIsPaid(s) ? (
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                            Owed
                          </span>
                        )}
                        {s.institution && (
                          <span className="inline-block rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {s.institution}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-3 py-2 align-middle font-mono sm:table-cell">
                      {fh(s.hours)}
                    </td>
                    <td className="px-3 py-2 align-middle font-mono">
                      {formatMoney(getShiftRate(s), currencySymbol)}/hr
                    </td>
                    <td className="px-3 py-2 align-middle font-mono text-emerald-600">
                      {formatMoney(s.hours * getShiftRate(s), currencySymbol)}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full border"
                        onClick={() => onOpenActions(s.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAllShifts.length}
          itemLabel="entries"
          onPageChange={setPage}
        />
      </div>
    );
  }

  type KeyFn = (d: string) => string;
  let keyFn: KeyFn;
  let labelFn: (k: string) => string;
  if (periodView === "day") {
    keyFn = (d) => d;
    labelFn = (k) => fd(k, calendarSystem);
  } else if (periodView === "week") {
    keyFn = (d) => weekKey(d);
    labelFn = (k) => {
      const [a, b] = k.split("__");
      if (calendarSystem === "BS") {
        return `${formatAppDate(a, "BS")} - ${formatAppDate(b, "BS")}`;
      }
      const [y1, mo1, d1] = a.split("-");
      const [y2, mo2, d2] = b.split("-");
      if (mo1 === mo2 && y1 === y2) {
        return `${parseInt(d1, 10)}-${parseInt(d2, 10)} ${MONTHS_SHORT[parseInt(mo2, 10) - 1]} ${y2}`;
      }
      return `${fd(a, calendarSystem)} - ${fd(b, calendarSystem)}`;
    };
  } else {
    keyFn = (d) => monthKey(d);
    labelFn = (k) => formatAppMonthKey(k, calendarSystem);
  }

  const map: Record<string, { shifts: Shift[]; hours: number; earn: number }> =
    {};
  shifts.forEach((s) => {
    const k = keyFn(s.date);
    if (!map[k]) map[k] = { shifts: [], hours: 0, earn: 0 };
    map[k].shifts.push(s);
    map[k].hours += s.hours;
    map[k].earn += s.hours * getShiftRate(s);
  });

  Object.values(map).forEach((entry) => {
    entry.shifts = sortShiftsLatestFirst(entry.shifts);
  });

  const keys = Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .filter((k) => {
      const d = map[k];
      const paid = paidForPeriod(k, periodView, shifts);
      const owed = Math.max(0, d.earn - paid);
      const isPaid = paid >= d.earn - 0.005 && d.earn > 0;
      return matchesShiftStatus(isPaid, owed);
    });

  if (!keys.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No shift groups match the selected status filter.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(keys.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedKeys = keys.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-3">
      {paginatedKeys.map((k) => {
        const d = map[k];
        const paid = paidForPeriod(k, periodView, shifts);
        const owed = Math.max(0, d.earn - paid);
        const isPaid = paid >= d.earn - 0.005 && d.earn > 0;
        const bid = `b_${k.replace(/[^a-z0-9]/gi, "_")}`;
        const isOpen = expanded[bid];

        return (
          <div
            key={k}
            className="overflow-hidden rounded-xl border bg-background"
          >
            <div
              className="flex w-full items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-muted/40"
              onClick={() => togglePeriod(bid)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePeriod(bid);
                }
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{labelFn(k)}</div>
                <div className="text-xs text-muted-foreground">
                  {fh(d.hours)} · {d.shifts.length} shift
                  {d.shifts.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectedShifts.size === 0 && (isPaid ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Paid
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                    onClick={(e) => {
                      e.stopPropagation();
                      markPaid(k, periodView, labelFn(k), owed);
                    }}
                  >
                    Make paid
                  </Button>
                ))}
                <span className="font-mono text-sm font-medium text-emerald-600">
                  {formatMoney(d.earn, currencySymbol)}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            {isOpen ? (
              <div className="border-t">
                {isMobile ? (
                  <div className="divide-y">
                    {d.shifts.map((s) => {
                      const earned = s.hours * getShiftRate(s);
                      return (
                        <div
                          key={s.id}
                          className="flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-muted/40 transition-colors"
                          onClick={() => onOpenDetails(s.id)}
                        >
                          <button
                            type="button"
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                              selectedShifts.has(s.id)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/50",
                            )}
                            onClick={(e) => { e.stopPropagation(); onToggleSelect(s.id); }}
                          >
                            {selectedShifts.has(s.id) && (
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{fd(s.date, calendarSystem)}</span>
                              <span className="font-mono text-sm text-emerald-600">
                                {formatMoney(earned, currencySymbol)}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono">{fh(s.hours)} @ {formatMoney(getShiftRate(s), currencySymbol)}/hr</span>
                              {s.institution && (
                                <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {s.institution}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full border"
                            onClick={(e) => { e.stopPropagation(); onOpenActions(s.id); }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="overflow-x-auto px-1">
                  <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="w-12 px-3 py-2.5">
                          <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center rounded border border-border hover:border-primary/50"
                            onClick={() => {
                              const allSel = d.shifts.every(sh => selectedShifts.has(sh.id));
                              d.shifts.forEach(sh => {
                                if (allSel && selectedShifts.has(sh.id)) onToggleSelect(sh.id);
                                else if (!allSel && !selectedShifts.has(sh.id)) onToggleSelect(sh.id);
                              });
                            }}
                          >
                            {d.shifts.length > 0 && d.shifts.every(sh => selectedShifts.has(sh.id)) && (
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Note / time</th>
                        <th className="hidden px-3 py-2 sm:table-cell">
                          Hours
                        </th>
                        <th className="px-3 py-2">Rate</th>
                        <th className="px-3 py-2">Earned</th>
                        <th className="w-14 px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {d.shifts.map((s) => (
                        <tr
                          key={s.id}
                          className={cn(
                            "border-b last:border-0 hover:bg-muted/40",
                            selectedShifts.has(s.id) && "bg-primary/5",
                          )}
                        >
                          <td className="px-3 py-2.5 align-middle">
                            <button
                              type="button"
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                                selectedShifts.has(s.id)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/50",
                              )}
                              onClick={() => onToggleSelect(s.id)}
                            >
                              {selectedShifts.has(s.id) && (
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {fd(s.date, calendarSystem)}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <button
                              type="button"
                              className="block w-full text-left hover:text-primary"
                              onClick={() => onOpenDetails(s.id)}
                            >
                              {s.note || formatShiftTimeRange(s)}
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                {s.note
                                  ? formatShiftTimeRange(s)
                                  : "Tap for details"}
                              </span>
                            </button>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {shiftIsPaid(s) ? (
                                <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  Paid
                                </span>
                              ) : null}
                              {s.institution && (
                                <span className="inline-block rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {s.institution}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden px-3 py-2 align-middle font-mono sm:table-cell">
                            {fh(s.hours)}
                          </td>
                          <td className="px-3 py-2 align-middle font-mono">
                            {formatMoney(getShiftRate(s), currencySymbol)}/hr
                          </td>
                          <td className="px-3 py-2 align-middle font-mono text-emerald-600">
                            {formatMoney(
                              s.hours * getShiftRate(s),
                              currencySymbol,
                            )}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full border"
                              onClick={() => onOpenActions(s.id)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2 text-xs">
                  <div className="flex flex-wrap gap-3 font-mono">
                    <span>
                      Total:{" "}
                      <strong>{formatMoney(d.earn, currencySymbol)}</strong>
                    </span>
                    <span className="text-emerald-600">
                      Paid: <strong>{formatMoney(paid, currencySymbol)}</strong>
                    </span>
                    <span
                      className={
                        owed > 0 ? "text-amber-600" : "text-emerald-600"
                      }
                    >
                      Owed: <strong>{formatMoney(owed, currencySymbol)}</strong>
                    </span>
                  </div>
                  {isPaid ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Fully paid
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      <Pager
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={keys.length}
        itemLabel="groups"
        onPageChange={setPage}
      />
    </div>
  );
}

function Pager({
  currentPage,
  totalPages,
  totalItems,
  itemLabel,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Page {currentPage} of {totalPages} · {totalItems} {itemLabel}
      </span>
      <span className="text-xs text-muted-foreground sm:hidden">
        {currentPage}/{totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3 text-xs"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <svg className="h-3.5 w-3.5 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3 text-xs"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="h-3.5 w-3.5 sm:ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

