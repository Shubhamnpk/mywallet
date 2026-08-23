"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchableComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  allowCreate?: boolean
  createText?: (value: string) => string
  className?: string
}

export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder,
  allowCreate = false,
  createText,
  className,
}: SearchableComboboxProps) {
  const [focused, setFocused] = useState(false)
  const q = value.trim().toLowerCase()
  const exactMatch = options.some((o) => o.toLowerCase() === q)
  const matches = useMemo(() => {
    if (!q) return []
    return options.filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q)
  }, [options, q])
  const showCreate = allowCreate && q.length > 0 && !exactMatch
  const open = focused && (matches.length > 0 || showCreate)

  return (
    <div className={cn("relative", className)}>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border/40 bg-popover shadow-md overflow-hidden">
          {matches.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(o)
                setFocused(false)
              }}
              className="flex w-full items-center px-3 py-2 text-left text-xs hover:bg-muted/60"
            >
              <span className="font-bold truncate">{o}</span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setFocused(false)
              }}
              className="flex w-full items-center gap-2 border-t border-border/20 px-3 py-2 text-left text-xs hover:bg-muted/60"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold">{createText ? createText(value.trim()) : `Create "${value.trim()}"`}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
