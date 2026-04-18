"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useWalletData } from "@/contexts/wallet-data-context";
import { getCurrencySymbol } from "@/lib/currency";
import { cn } from "@/lib/utils";
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
}

export function LogShiftDialog({
  open,
  onOpenChange,
  onSave,
  defaultRateInput,
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
  const [rateHint, setRateHint] = useState("12.50");
  const [timeFormat, setTimeFormat] = useState<TimeFmt>("12h");

  useEffect(() => {
    if (!open) return;
    setFormDate(todayStr());
    setFormStart("");
    setFormEnd("");
    setFormNote("");
    setFormRate("");
    try {
      const r = localStorage.getItem(STORAGE_RATE);
      if (defaultRateInput !== undefined) {
        setRateHint(defaultRateInput);
      } else if (r) {
        setRateHint(r);
      }
      const tf = localStorage.getItem(STORAGE_TIME_FMT) as TimeFmt | null;
      if (tf === "12h" || tf === "24h") setTimeFormat(tf);
    } catch {
      /* ignore */
    }
  }, [open, defaultRateInput]);

  const getRate = useCallback(() => {
    const v = parseFloat(rateHint);
    return Number.isFinite(v) ? v : 0;
  }, [rateHint]);

  const formatMoney = (n: number) =>
    `${currencySymbol}${Math.abs(n).toFixed(2)}`;

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

  const previewText = useMemo(() => {
    if (!formStart || !formEnd) {
      return "Enter start and end time to see earnings preview.";
    }
    const h = calcHours(formStart, formEnd);
    const r = parseFloat(formRate);
    const rate = Number.isFinite(r) ? r : getRate();
    return `${formatTimeValue(formStart)} → ${formatTimeValue(formEnd)}  ·  ${h.toFixed(2)}h × ${formatMoney(rate)}/hr = ${formatMoney(h * rate)}`;
  }, [formStart, formEnd, formRate, getRate, formatMoney, formatTimeValue]);

  const handleSave = () => {
    if (!formDate || !formStart || !formEnd) {
      toast.error("Please fill in date, start time, and end time.");
      return;
    }
    const rateOverride = parseFloat(formRate);
    const shift: Shift = {
      id: Date.now(),
      date: formDate,
      start: formStart,
      end: formEnd,
      note: formNote.trim(),
      hours: calcHours(formStart, formEnd),
    };
    if (!Number.isNaN(rateOverride)) shift.rate = rateOverride;
    if (onSave(shift)) onOpenChange(false);
  };

  const canSave = Boolean(formDate && formStart && formEnd);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md gap-0 p-0 overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-300",
        )}
      >
        <DialogHeader className="p-6 pb-4 space-y-2 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Log a shift
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-snug">
                Record date, times, and optional note. Saved shifts sync with Shift
                tracker.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
          <Card className="border-2 border-muted/50 bg-background/60 backdrop-blur-sm rounded-2xl shadow-none overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="log-shift-date"
                    className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80"
                  >
                    Date
                  </Label>
                  <Input
                    id="log-shift-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-11 rounded-xl border-muted/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="log-shift-rate"
                    className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80"
                  >
                    Rate ({currencySymbol}/hr)
                  </Label>
                  <Input
                    id="log-shift-rate"
                    type="number"
                    step={0.5}
                    placeholder="Optional"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    className="h-11 rounded-xl border-muted/60 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Default: {formatMoney(getRate())}/h
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="log-shift-start"
                    className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80"
                  >
                    Start
                  </Label>
                  <Input
                    id="log-shift-start"
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="h-11 rounded-xl border-muted/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="log-shift-end"
                    className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80"
                  >
                    End
                  </Label>
                  <Input
                    id="log-shift-end"
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="h-11 rounded-xl border-muted/60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="log-shift-note"
                  className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80"
                >
                  Note (optional)
                </Label>
                <Input
                  id="log-shift-note"
                  placeholder="e.g. Opening shift, overtime"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="h-11 rounded-xl border-muted/60"
                />
              </div>
            </CardContent>
          </Card>

          <div
            className={cn(
              "rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 font-mono text-sm",
              "text-emerald-900 dark:text-emerald-100 dark:bg-emerald-950/30",
            )}
          >
            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-700/80 dark:text-emerald-400/90 mb-1.5">
              Preview
            </p>
            {previewText}
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0 border-t border-border/40 bg-muted/10">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 rounded-2xl font-semibold border-muted/60"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-[2] h-12 rounded-2xl font-semibold shadow-lg shadow-primary/15"
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
