"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forwardRef, useEffect, useRef, useState } from "react"
import type { ComponentPropsWithoutRef } from "react"

interface AmountInputProps extends Omit<ComponentPropsWithoutRef<typeof Input>, "value" | "onChange" | "type"> {
  value: string | number
  onChange: (value: string) => void
  currencySymbol?: string
  label?: string
  required?: boolean
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, currencySymbol = "$", label, required = false, className, ...props }, ref) => {
    const [displayAmount, setDisplayAmount] = useState("")
    const [locale, setLocale] = useState<"us" | "eu" | "in">(() => {
      return (typeof window !== 'undefined' ? (localStorage.getItem("wallet_number_format") || "us") : "us") as "us" | "eu" | "in"
    })

    // Get locale string from current locale state
    const getLocaleString = () => {
      return locale === 'us' ? 'en-US' : locale === 'eu' ? 'de-DE' : 'en-IN'
    }

    // Listen for number format changes from localStorage
    useEffect(() => {
      const updateFormat = () => {
        const newFormat = (localStorage.getItem("wallet_number_format") || "us") as "us" | "eu" | "in"
        setLocale(newFormat)
        // Re-render display amount with new format
        const stringValue = typeof value === "number" ? value.toString() : value
        setDisplayAmount(formatDisplayAmount(stringValue))
      }

      window.addEventListener('storage', updateFormat)
      window.addEventListener('numberFormatChange', updateFormat)
      updateFormat()

      return () => {
        window.removeEventListener('storage', updateFormat)
        window.removeEventListener('numberFormatChange', updateFormat)
      }
    }, [value])

    // Format amount for display with locale-appropriate formatting
    const formatDisplayAmount = (rawValue: string) => {
      if (!rawValue) return ""
      
      const hasTrailingDot = rawValue.endsWith('.')
      const parts = rawValue.split('.')
      const intPart = parts[0] || '0'
      const decPart = parts.length > 1 ? parts[1] : ''

      // Format integer part with locale
      const formattedInt = parseInt(intPart, 10).toLocaleString(getLocaleString())

      // Combine with decimal part, preserving trailing dot while typing
      if (hasTrailingDot) {
        return `${formattedInt}.`
      } else if (decPart) {
        return `${formattedInt}.${decPart}`
      } else {
        return formattedInt
      }
    }

    // Update display amount when value changes externally
    useEffect(() => {
      const stringValue = typeof value === "number" ? value.toString() : value
      setDisplayAmount(formatDisplayAmount(stringValue))
    }, [value, locale])

    // Listen for number format changes from localStorage
    useEffect(() => {
      const updateFormat = () => {
        const newFormat = localStorage.getItem("wallet_number_format") || "us"
        // Re-render display amount with new format
        const stringValue = typeof value === "number" ? value.toString() : value
        setDisplayAmount(formatDisplayAmount(stringValue))
      }

      window.addEventListener('storage', updateFormat)
      window.addEventListener('numberFormatChange', updateFormat)
      updateFormat()

      return () => {
        window.removeEventListener('storage', updateFormat)
        window.removeEventListener('numberFormatChange', updateFormat)
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value

      // Remove existing commas for processing
      const rawValue = val.replace(/,/g, '')

      // Allow: digits, optional single dot, up to 2 digits after dot
      // Also allow trailing dot (e.g., "123.") while typing
      const isValid = /^\d*\.?\d{0,2}$/.test(rawValue) || rawValue === ''

      if (isValid) {
        // Update display with formatted value
        setDisplayAmount(formatDisplayAmount(rawValue))
        // Pass raw value (without commas) to parent
        onChange(rawValue)
      }
    }

    const handleBlur = () => {
      // On blur, if there's a trailing dot, remove it
      if (displayAmount.endsWith('.')) {
        const cleanValue = displayAmount.slice(0, -1)
        setDisplayAmount(cleanValue)
        onChange(cleanValue.replace(/,/g, ''))
      }
    }

    return (
      <div className="space-y-1">
        {label && (
          <Label htmlFor={props.id} className="text-sm font-medium flex items-center gap-1">
            {label}
            {required && <span className="text-orange-500">*</span>}
          </Label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
            {currencySymbol}
          </span>
          <Input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayAmount}
            onChange={handleChange}
            onBlur={handleBlur}
            className="pl-8"
            {...props}
          />
        </div>
      </div>
    )
  }
)

AmountInput.displayName = "AmountInput"
