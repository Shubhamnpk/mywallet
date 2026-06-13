"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Shift,
  generateTextReport,
  todayStr,
} from "@/lib/shift-tracker-storage";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: Shift[];
  payments: { id: number; type: string; periodKey: string; amount: number; date: string; label: string }[];
  rate: number;
  timeFormat: "12h" | "24h";
  currencySymbol: string;
}

type ExportType = "simple" | "full" | "json" | "clipboard";
type Preset = "all" | "today" | "this-week" | "last-week" | "this-month" | "last-month" | "custom";

function presetRange(preset: Preset): DateRange | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "all":
      return undefined;
    case "today":
      return { from: today, to: today };
    case "this-week": {
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - ((day + 6) % 7));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: mon, to: sun };
    }
    case "last-week": {
      const day = today.getDay();
      const lastMon = new Date(today);
      lastMon.setDate(today.getDate() - ((day + 6) % 7) - 7);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastMon.getDate() + 6);
      return { from: lastMon, to: lastSun };
    }
    case "this-month":
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      };
    case "last-month":
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 0),
      };
    default:
      return undefined;
  }
}

function generatePlainText(
  shifts: Shift[],
  timeFormat: "12h" | "24h",
  showNotes: boolean,
  showRate: boolean,
  showPayments: boolean,
  rate: number,
  payments: { id: number; type: string; periodKey: string; amount: number }[],
  currencySymbol: string,
): string {
  const fmtTime = (t: string) => {
    if (!t || timeFormat === "24h") return t;
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const sorted = [...shifts].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const shiftIds = new Set(sorted.map((s) => s.id));

  const rows = sorted.map((sh) => {
    const earned = sh.hours * (sh.rate ?? rate);
    const paid = payments
      .filter((p) => p.type === "shift" && shiftIds.has(Number(p.periodKey)))
      .reduce((s, p) => s + p.amount, 0);
    const isPaid = paid >= earned;
    return {
      date: formatDatePlain(sh.date),
      inst: sh.institution || "-",
      time: `${fmtTime(sh.start)} - ${fmtTime(sh.end)}`,
      hours: fmtHM(sh.hours),
      note: showNotes && sh.note ? sh.note : "",
      amount: showRate ? `${currencySymbol}${earned.toFixed(2)}` : "",
      status: showPayments ? (isPaid ? "Paid" : "Owed") : "",
    };
  });

  const w = (s: string) => s.length;
  const cw: Record<string, number> = {
    date: Math.max(12, ...rows.map((r) => w(r.date))),
    inst: Math.max(12, ...rows.map((r) => w(r.inst))),
    time: Math.max(13, ...rows.map((r) => w(r.time))),
    hours: Math.max(6, ...rows.map((r) => w(r.hours))),
    note: showNotes ? Math.max(5, ...rows.map((r) => w(r.note))) : 0,
    amount: showRate ? Math.max(8, ...rows.map((r) => w(r.amount))) : 0,
    status: showPayments ? Math.max(6, ...rows.map((r) => w(r.status))) : 0,
  };

  const pad = (s: string, len: number) => s.padEnd(len);

  const cols = ["Date", "Institution", "Duration", "Hours"];
  const cwArr = [cw.date, cw.inst, cw.time, cw.hours];
  if (showNotes) { cols.push("Notes"); cwArr.push(cw.note); }
  if (showRate) { cols.push("Amount"); cwArr.push(cw.amount); }
  if (showPayments) { cols.push("Status"); cwArr.push(cw.status); }

  const header = cols.map((c, i) => pad(c, cwArr[i])).join("  ");
  const divider = "─".repeat(header.length);

  const body = rows.map((r) => {
    const cells = [r.date, r.inst, r.time, r.hours];
    const vals = [r.date, r.inst, r.time, r.hours];
    if (showNotes) { cells.push(r.note); vals.push(r.note); }
    if (showRate) { cells.push(r.amount); vals.push(r.amount); }
    if (showPayments) { cells.push(r.status); vals.push(r.status); }
    return cells.map((c, i) => pad(c, cwArr[i])).join("  ");
  });

  const totalHours = sorted.reduce((s, sh) => s + sh.hours, 0);
  const totalEarned = showRate ? sorted.reduce((s, sh) => s + sh.hours * (sh.rate ?? rate), 0) : 0;
  const totalPaid = showPayments
    ? payments.filter((p) => p.type === "shift" && shiftIds.has(Number(p.periodKey)))
        .reduce((s, p) => s + p.amount, 0)
    : 0;

  const summaryParts = [`Total: ${sorted.length} shift${sorted.length !== 1 ? "s" : ""}, ${fmtHM(totalHours)}`];
  if (showRate) summaryParts.push(`${currencySymbol}${totalEarned.toFixed(2)} earned`);
  if (showPayments) summaryParts.push(`${currencySymbol}${totalPaid.toFixed(2)} paid, ${currencySymbol}${Math.max(0, totalEarned - totalPaid).toFixed(2)} owed`);

  return [header, divider, ...body, "", summaryParts.join(", "), "", "Generated by MyWallet"].join("\n");
}

function formatDatePlain(d: string) {
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

export function ExportDialog({
  open,
  onOpenChange,
  shifts,
  payments,
  rate,
  timeFormat,
  currencySymbol,
}: ExportDialogProps) {
  const [preset, setPreset] = useState<Preset>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [exportType, setExportType] = useState<ExportType>("full");
  const [showRate, setShowRate] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showPayments, setShowPayments] = useState(true);

  const allInstitutions = useMemo(() => {
    const insts = new Set<string>();
    shifts.forEach((s) => { if (s.institution) insts.add(s.institution); });
    return Array.from(insts).sort();
  }, [shifts]);

  const [selectedInstitutions, setSelectedInstitutions] = useState<Set<string>>(new Set(allInstitutions));

  const filteredShifts = useMemo(() => {
    let result = shifts;
    if (dateRange?.from) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      result = result.filter((s) => s.date >= fromStr);
    }
    if (dateRange?.to) {
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      result = result.filter((s) => s.date <= toStr);
    }
    if (selectedInstitutions.size > 0 && selectedInstitutions.size < allInstitutions.length) {
      result = result.filter((s) => s.institution && selectedInstitutions.has(s.institution));
    }
    return result;
  }, [shifts, dateRange, selectedInstitutions, allInstitutions]);

  const toggleInstitution = (inst: string) => {
    setSelectedInstitutions((prev) => {
      const next = new Set(prev);
      if (next.has(inst)) next.delete(inst);
      else next.add(inst);
      return next;
    });
  };

  const handleExport = () => {
    if (filteredShifts.length === 0) {
      toast.error("No shifts match the selected filters");
      return;
    }

    const filteredIds = filteredShifts.map((s) => s.id);

    if (exportType === "clipboard") {
      const text = generatePlainText(filteredShifts, timeFormat, showNotes, showRate, showPayments, rate, payments, currencySymbol);
      navigator.clipboard.writeText(text);
      toast.success(`Copied ${filteredShifts.length} shifts to clipboard`);
    } else if (exportType === "json") {
      const data = {
        source: "MyWallet",
        shifts: filteredShifts,
        payments,
        exportedAt: todayStr(),
        version: "mywallet-1",
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shift_backup_${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filteredShifts.length} shifts as JSON`);
    } else {
      const opts = {
        showRate: exportType === "full" && showRate,
        showPayments: exportType === "full" && showPayments,
        showNotes,
      };
      const report = generateTextReport(
        shifts,
        payments,
        rate,
        timeFormat,
        currencySymbol,
        filteredIds,
        opts,
      );
      const suffix = dateRange?.from
        ? `_${format(dateRange.from, "yyyyMMdd")}-${dateRange.to ? format(dateRange.to, "yyyyMMdd") : "open"}`
        : "";
      const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shift_report_${todayStr()}${suffix}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filteredShifts.length} shifts as text`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="sm:max-w-md gap-0 p-0 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300"
      >
        <div className="flex items-center gap-3 pl-5 pr-12 pt-5 pb-3 border-b border-border/40">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Download className="h-4 w-4" />
          </div>
          <DialogTitle className="text-base font-semibold">Export shifts</DialogTitle>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Date range */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
              Date range
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "all" as Preset, label: "All time" },
                { value: "today" as Preset, label: "Today" },
                { value: "this-week" as Preset, label: "This week" },
                { value: "last-week" as Preset, label: "Last week" },
                { value: "this-month" as Preset, label: "This month" },
                { value: "last-month" as Preset, label: "Last month" },
                { value: "custom" as Preset, label: "Custom" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                    preset === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setPreset(opt.value);
                    setDateRange(presetRange(opt.value));
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="flex gap-2 mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal h-10 rounded-xl border-muted/60"
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      {dateRange?.from ? format(dateRange.from, "d MMM yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange?.from}
                      onSelect={(d) => setDateRange((prev) => ({ from: d ?? undefined, to: prev?.to }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal h-10 rounded-xl border-muted/60"
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      {dateRange?.to ? format(dateRange.to, "d MMM yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange?.to}
                      onSelect={(d) => setDateRange((prev) => ({ from: prev?.from, to: d ?? undefined }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {preset !== "all" && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => {
                  setPreset("all");
                  setDateRange(undefined);
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Institutions */}
          {allInstitutions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
                Institutions
              </Label>
              <div className="flex flex-wrap gap-2">
                {allInstitutions.map((inst) => {
                  const checked = selectedInstitutions.has(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => toggleInstitution(inst)}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>
              {selectedInstitutions.size < allInstitutions.length && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => setSelectedInstitutions(new Set(allInstitutions))}
                >
                  Select all
                </button>
              )}
            </div>
          )}

          {/* Export type */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
              Export type
            </Label>
            <div className="flex gap-2">
              {[
                { value: "clipboard" as const, label: "Plain text", desc: "Copy to clipboard" },
                { value: "simple" as const, label: "Simple", desc: "Dates & hours only" },
                { value: "full" as const, label: "Full", desc: "With rates & payments" },
                { value: "json" as const, label: "JSON", desc: "Machine-readable backup" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    exportType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/30",
                  )}
                  onClick={() => setExportType(opt.value)}
                >
                  <div className={cn(
                    "text-sm font-semibold",
                    exportType === opt.value ? "text-primary" : "text-foreground",
                  )}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Options (only for text/copy exports) */}
          {exportType !== "json" && (
            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
                Include in report
              </Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showNotes} onCheckedChange={(v) => setShowNotes(v === true)} />
                  <span className="text-sm">Notes</span>
                </label>
                {(exportType === "full" || exportType === "clipboard") && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={showRate} onCheckedChange={(v) => setShowRate(v === true)} />
                      <span className="text-sm">Rate &amp; earnings</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={showPayments} onCheckedChange={(v) => setShowPayments(v === true)} />
                      <span className="text-sm">Payment status</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Summary info */}
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            <div className="font-medium text-foreground">Summary</div>
            <div>{filteredShifts.length} shift{filteredShifts.length !== 1 ? "s" : ""}</div>
            {filteredShifts.length > 0 && (
              <div>
                {filteredShifts[filteredShifts.length - 1].date} — {filteredShifts[0].date}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border/40 bg-muted/10">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 rounded-xl border-muted/60"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 h-11 rounded-xl"
            onClick={handleExport}
            disabled={filteredShifts.length === 0}
          >
            {exportType === "clipboard" ? (
              <Copy className="mr-2 h-4 w-4" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exportType === "clipboard" ? "Copy" : "Export"} ({filteredShifts.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
