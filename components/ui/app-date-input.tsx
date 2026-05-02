"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import type { CalendarSystem } from "@/lib/app-calendar"
import { adToBsDateKey, bsToAdDateKey, formatAppDate, getCalendarSystem } from "@/lib/app-calendar"

interface AppDateInputProps {
  id?: string
  value?: string
  onChange: (adDate: string) => void
  calendarSystem?: CalendarSystem | string | null
  className?: string
  disabled?: boolean
}

export function AppDateInput({
  id,
  value = "",
  onChange,
  calendarSystem,
  className,
  disabled,
}: AppDateInputProps) {
  const system = getCalendarSystem(calendarSystem)
  const [bsValue, setBsValue] = useState("")

  useEffect(() => {
    if (system === "BS") {
      setBsValue(adToBsDateKey(value))
    }
  }, [system, value])

  if (system === "BS") {
    const adValue = bsToAdDateKey(bsValue)

    return (
      <div className="space-y-1">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="2083-01-19"
          className={className}
          value={bsValue}
          disabled={disabled}
          onChange={(event) => {
            const nextBs = event.target.value
            setBsValue(nextBs)
            const nextAd = bsToAdDateKey(nextBs)
            if (nextAd) onChange(nextAd)
          }}
        />
        <p className="text-[10px] text-muted-foreground">
          BS date. AD saved as {adValue || "valid YYYY-MM-DD"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="date"
        className={className}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-[10px] text-muted-foreground">
        {formatAppDate(value, "AD")}
      </p>
    </div>
  )
}

