"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useWalletData } from "@/contexts/wallet-data-context";
import { getCurrencySymbol } from "@/lib/currency";
import { cn, formatMoney } from "@/lib/utils";
import {
  STORAGE_RATE,
  STORAGE_TIME_FMT,
  type Shift,
  calcHours,
  todayStr,
} from "@/lib/shift-tracker-storage";

type TimeFmt = "12h" | "24h";

export interface LogShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Return true to close the dialog, false to keep it open (e.g. persist failed). */
  onSave: (shift: Shift) => boolean;
  /** When set (e.g. from Shift tracker), used for default rate hint and preview. */
  defaultRateInput?: string;
  /** When provided, dialog enters edit mode for the given shift. */
  initialShift?: Shift;
}

export function LogShiftDialog({
  open,
  onOpenChange,
  onSave,
  defaultRateInput,
  initialShift,
}: LogShiftDialogProps) {
  const { userProfile } = useWalletData();
  const currencySymbol = getCurrencySymbol(
    userProfile?.currency ?? "USD",
    userProfile?.customCurrency,
  );

  const [formDate, setFormDate] = useState(todayStr());
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formInstitution, setFormInstitution] = useState("");
  const [rateHint, setRateHint] = useState("12.50");
  const [timeFormat, setTimeFormat] = useState<TimeFmt>("12h");

  useEffect(() => {
    if (!open) return;
    if (initialShift) {
      // Edit mode: populate with existing shift data
      setFormDate(initialShift.date);
      setFormStart(initialShift.start);
      setFormEnd(initialShift.end);
      setFormNote(initialShift.note || "");
      setFormRate(initialShift.rate ? String(initialShift.rate) : "");
      setFormInstitution(initialShift.institution || "");
      setRateHint(defaultRateInput !== undefined ? defaultRateInput : String(initialShift.rate || 12.5));
    } else {
      // Add mode: reset fields
      setFormDate(todayStr());
      setFormStart("");
      setFormEnd("");
      setFormNote("");
      setFormRate("");
      setFormInstitution("");
      try {
        const r = localStorage.getItem(STORAGE_RATE);
        if (defaultRateInput !== undefined) {
          setRateHint(defaultRateInput);
        } else if (r) {
          setRateHint(r);
        }
      } catch {
        /* ignore */
      }
    }
    try {
      const tf = localStorage.getItem(STORAGE_TIME_FMT) as TimeFmt | null;
      if (tf === "12h" || tf === "24h") setTimeFormat(tf);
    } catch {
      /* ignore */
    }
  }, [open, defaultRateInput, initialShift]);

  const getRate = useCallback(() => {
    const v = parseFloat(rateHint);
    return Number.isFinite(v) ? v : 0;
  }, [rateHint]);

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

  const preview = useMemo(() => {
    if (!formStart || !formEnd) {
      return null;
    }
    const hours = calcHours(formStart, formEnd);
    const r = parseFloat(formRate);
    const rate = Number.isFinite(r) ? r : getRate();
    const earnings = hours * rate;
    return {
      startTime: formatTimeValue(formStart),
      endTime: formatTimeValue(formEnd),
      hours,
      rate,
      earnings,
      isValid: hours > 0,
    };
  }, [formStart, formEnd, formRate, getRate, formatTimeValue]);

  const handleSave = () => {
    if (!formDate || !formStart || !formEnd) {
      toast.error("Please fill in date, start time, and end time.");
      return;
    }
    const rateOverride = parseFloat(formRate);
    const shift: Shift = {
      id: initialShift?.id ?? Date.now(),
      date: formDate,
      start: formStart,
      end: formEnd,
      note: formNote.trim(),
      hours: calcHours(formStart, formEnd),
    };
    if (!Number.isNaN(rateOverride)) shift.rate = rateOverride;
    if (formInstitution.trim()) shift.institution = formInstitution.trim();
    if (onSave(shift)) onOpenChange(false);
  };

  const canSave = Boolean(formDate && formStart && formEnd);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "sm:max-w-sm gap-0 p-0 overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 pl-5 pr-12 pt-5 pb-3 border-b border-border/40">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <DialogTitle className="text-base font-semibold">
            {initialShift ? "Edit shift" : "New shift"}
          </DialogTitle>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Date + Rate row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="log-shift-date" className="text-xs text-muted-foreground font-medium">
                Date
              </Label>
              <Input
                id="log-shift-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-10 rounded-lg border-muted/60 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-shift-rate" className="text-xs text-muted-foreground font-medium">
                Rate ({currencySymbol}/hr)
              </Label>
              <Input
                id="log-shift-rate"
                type="number"
                step={0.5}
                placeholder="Default"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                className="h-10 rounded-lg border-muted/60 text-sm font-mono"
              />
            </div>
          </div>

          {/* Start + End row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="log-shift-start" className="text-xs text-muted-foreground font-medium">
                Start
              </Label>
              <Input
                id="log-shift-start"
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="h-10 rounded-lg border-muted/60 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-shift-end" className="text-xs text-muted-foreground font-medium">
                End
              </Label>
              <Input
                id="log-shift-end"
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="h-10 rounded-lg border-muted/60 text-sm"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="log-shift-note" className="text-xs text-muted-foreground font-medium">
              Note
            </Label>
            <Input
              id="log-shift-note"
              placeholder="e.g. Opening shift, overtime"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="h-10 rounded-lg border-muted/60 text-sm"
            />
          </div>

          {/* Institution */}
          <div className="space-y-1.5">
            <Label htmlFor="log-shift-institution" className="text-xs text-muted-foreground font-medium">
              Institution
            </Label>
            <Input
              id="log-shift-institution"
              placeholder="e.g. ABC School, XYZ Corp"
              value={formInstitution}
              onChange={(e) => setFormInstitution(e.target.value)}
              className="h-10 rounded-lg border-muted/60 text-sm"
            />
          </div>

          {/* Preview */}
          <div
            className={cn(
              "rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3 text-sm",
              !preview
                ? "bg-muted/30 text-muted-foreground"
                : !preview.isValid
                  ? "bg-amber-50/80 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300",
            )}
          >
            {!preview ? (
              <>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs">Enter times to preview</span>
              </>
            ) : !preview.isValid ? (
              <>
                <Timer className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs">End must be after start</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{preview.startTime}</span>
                  <span className="text-muted-foreground/40">—</span>
                  <span className="font-medium tabular-nums">{preview.endTime}</span>
                  <span className="h-3.5 w-px bg-current opacity-20" />
                  <span className="font-medium tabular-nums">{preview.hours.toFixed(1)}h</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70">{formatMoney(preview.rate, currencySymbol)}/hr</span>
                  <span className="h-3.5 w-px bg-current opacity-20" />
                  <span className="font-semibold tabular-nums">
                    {formatMoney(preview.earnings, currencySymbol)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 py-4 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 h-10 rounded-xl text-sm font-medium"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-[2] h-10 rounded-xl text-sm font-medium shadow-sm"
            onClick={handleSave}
            disabled={!canSave}
          >
            Save shift
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
