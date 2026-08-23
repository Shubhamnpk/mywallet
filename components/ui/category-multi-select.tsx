"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import { Search, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Category } from "@/types/wallet"

interface CategoryMultiSelectProps {
  selected: string[]
  onChange: (selected: string[]) => void
  categories: Category[]
  onAddCategory?: (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">) => Category
  placeholder?: string
  emptyMessage?: string
  className?: string
  error?: string
}

export function CategoryMultiSelect({
  selected,
  onChange,
  categories,
  onAddCategory,
  placeholder = "Search or add categories...",
  emptyMessage = "No categories found",
  className,
  error,
}: CategoryMultiSelectProps) {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()

  const exactMatch = categories.some((c) => c.name.toLowerCase() === q && c.type === "expense")
  const isSelected = selected.some((s) => s.toLowerCase() === q)

  const matches = useMemo(() => {
    if (!q) return []
    return categories
      .filter((c) => c.type === "expense" && c.name.toLowerCase().includes(q) && !selected.includes(c.name))
      .slice(0, 10)
  }, [categories, q, selected])

  const showCreate = q.length > 0 && !exactMatch && !isSelected
  const showAlreadyAdded = q.length > 0 && isSelected
  const open = focused && q.length > 0 && (matches.length > 0 || showCreate)

  const select = useCallback(
    (name: string) => {
      if (!selected.includes(name)) {
        onChange([...selected, name])
      }
      setQuery("")
      inputRef.current?.focus()
    },
    [selected, onChange],
  )

  const remove = useCallback(
    (name: string) => {
      onChange(selected.filter((s) => s !== name))
    },
    [selected, onChange],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (q.length === 0) return
      if (matches.length > 0 && !isSelected) {
        select(matches[0].name)
      } else if (showCreate) {
        if (onAddCategory) {
          onAddCategory({
            name: q,
            type: "expense",
            color: "#3b82f6",
            isDefault: false,
          })
        }
        select(q)
      } else if (isSelected) {
        setQuery("")
      }
    } else if (e.key === "Escape") {
      setFocused(false)
      inputRef.current?.blur()
    } else if (e.key === "Backspace" && q.length === 0 && selected.length > 0) {
      remove(selected[selected.length - 1])
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10"
        />
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border/40 bg-popover shadow-md overflow-hidden">
            {matches.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(cat.name)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors"
              >
                {cat.color && (
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                )}
                <span className="font-medium truncate flex-1">{cat.name}</span>
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (onAddCategory) {
                    onAddCategory({
                      name: q,
                      type: "expense",
                      color: "#3b82f6",
                      isDefault: false,
                    })
                  }
                  select(q)
                }}
                className="flex w-full items-center gap-2 border-t border-border/20 px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium">Create "{q}"</span>
              </button>
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => {
            const cat = categories.find((c) => c.name === name && c.type === "expense")
            return (
              <Badge
                key={name}
                variant="secondary"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
              >
                {cat?.color && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                )}
                {name}
                <button
                  type="button"
                  onClick={() => remove(name)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {!open && q.length > 0 && matches.length === 0 && !showCreate && !showAlreadyAdded && (
        <p className="text-xs text-muted-foreground px-1">{emptyMessage}</p>
      )}
      {showAlreadyAdded && (
        <p className="text-xs text-muted-foreground px-1">Already added</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
