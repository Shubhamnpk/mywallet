"use client"

import { useState, useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Camera, Mic, Calculator, Lock, Gamepad2, ArrowLeftRight, Clock, GripHorizontal, X, Minimize2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, History } from "lucide-react"
import { UnifiedTransactionDialog } from "./transaction-dialog"
import { useAuthentication } from "@/hooks/use-authentication"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getDefaultCategories } from "@/lib/categories"
import ReceiptScanner from "./receipt-scanner"
import { GamingPlaceModal } from "@/components/ui/gaming-place-modal"
import { CurrencyConverterDialog } from "./currency-converter-dialog"
import { LogShiftDialog } from "@/components/tools/log-shift-dialog"
import { appendShiftToStorage } from "@/lib/shift-tracker-storage"
import { Input } from "@/components/ui/input"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface FloatingAddButtonProps {
  className?: string
  onAddTransaction?: () => void
  onLockWallet?: () => void
}

const quickActions = [
  { id: "scan", icon: Camera, label: "Scan", color: "bg-emerald-500" },
  { id: "voice", icon: Mic, label: "Voice", color: "bg-blue-500" },
  { id: "calc", icon: Calculator, label: "Calc", color: "bg-amber-500" },
  { id: "convert", icon: ArrowLeftRight, label: "Convert", color: "bg-cyan-500" },
  { id: "shift", icon: Clock, label: "Shift", color: "bg-indigo-500" },
  { id: "game", icon: Gamepad2, label: "Game", color: "bg-purple-500" },
  { id: "lock", icon: Lock, label: "Lock", color: "bg-red-500" },
]

const calculatorButtons = [
  "7", "8", "9", "/", "Del",
  "4", "5", "6", "*", "C",
  "1", "2", "3", "+", "%",
  "0", "00", ".", "-", "=",
]

const normalizeCalculatorExpression = (value: string) =>
  value
    .replace(/[xX]/g, "*")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/[^0-9+\-*/.()%]/g, "")

const toEvaluableExpression = (value: string) =>
  normalizeCalculatorExpression(value).replace(/(\d+(?:\.\d+)?)%/g, "($1/100)")

const formatCalculatorResult = (value: number) => {
  if (!Number.isFinite(value)) return "Error"
  const rounded = Number(value.toFixed(10))
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

const calculateExpressionResult = (value: string) => {
  const expression = toEvaluableExpression(value)
  if (!expression || /[+\-*/.]$/.test(expression) || !/^[0-9+\-*/.()%]+$/.test(expression)) {
    return "Error"
  }

  try {
    const result = Function(`"use strict"; return (${expression})`)()
    return formatCalculatorResult(Number(result))
  } catch {
    return "Error"
  }
}

const getCalculatorPreview = (value: string) => {
  const normalized = normalizeCalculatorExpression(value)
  if (!normalized) return "0"
  if (/[+\-*/.]$/.test(normalized)) return "..."
  const result = calculateExpressionResult(normalized)
  return result === "Error" ? "..." : result
}

const CALCULATOR_PANEL_WIDTH = 384
const CALCULATOR_PANEL_HEIGHT = 560
const CALCULATOR_SCREEN_GAP = 16
const CALCULATOR_SNAP_DISTANCE = 28

type CalculatorDockEdge = "left" | "right" | "top" | "bottom"

type CalculatorPanelState = {
  id: string
  x: number
  y: number
  expression: string
  display: string
  history: Array<{ expression: string; result: string }>
  view: "keys" | "history"
  isDragging: boolean
  isDocked: boolean
  dockEdge: CalculatorDockEdge
}

const getVoiceAction = (isListening: boolean) => ({
  id: "voice",
  icon: Mic,
  label: isListening ? "Listening..." : "Voice",
  color: isListening ? "bg-red-500 animate-pulse" : "bg-blue-500",
})

export function FloatingAddButton({
  className,
  onAddTransaction,
  onLockWallet,
}: FloatingAddButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [calculators, setCalculators] = useState<CalculatorPanelState[]>([])
  const [isListening, setIsListening] = useState(false)
  const [prefilledAmount, setPrefilledAmount] = useState("")
  const [prefilledDescription, setPrefilledDescription] = useState("")
  const [prefilledType, setPrefilledType] = useState<"income" | "expense">("expense")
  const [prefilledCategory, setPrefilledCategory] = useState("")
  const [prefilledReceiptImage, setPrefilledReceiptImage] = useState("")
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false)
  const [isGamingPlaceOpen, setIsGamingPlaceOpen] = useState(false)
  const [isCurrencyConverterOpen, setIsCurrencyConverterOpen] = useState(false)
  const [isLogShiftOpen, setIsLogShiftOpen] = useState(false)

  const { isAuthenticated, lockApp } = useAuthentication()
  const isMobile = useIsMobile()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const calculatorDragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)

  const vibrateTap = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [])

  const vibrateHold = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }
  }, [])

  const clampCalculatorPosition = useCallback((position: { x: number; y: number }) => {
    if (typeof window === "undefined") return position

    const panelWidth = Math.min(CALCULATOR_PANEL_WIDTH, window.innerWidth - CALCULATOR_SCREEN_GAP * 2)
    const panelHeight = Math.min(CALCULATOR_PANEL_HEIGHT, window.innerHeight - CALCULATOR_SCREEN_GAP * 2)
    const maxX = Math.max(CALCULATOR_SCREEN_GAP, window.innerWidth - panelWidth - CALCULATOR_SCREEN_GAP)
    const maxY = Math.max(CALCULATOR_SCREEN_GAP, window.innerHeight - panelHeight - CALCULATOR_SCREEN_GAP)
    let x = Math.min(Math.max(position.x, CALCULATOR_SCREEN_GAP), maxX)
    let y = Math.min(Math.max(position.y, CALCULATOR_SCREEN_GAP), maxY)

    if (x - CALCULATOR_SCREEN_GAP <= CALCULATOR_SNAP_DISTANCE) x = CALCULATOR_SCREEN_GAP
    if (maxX - x <= CALCULATOR_SNAP_DISTANCE) x = maxX
    if (y - CALCULATOR_SCREEN_GAP <= CALCULATOR_SNAP_DISTANCE) y = CALCULATOR_SCREEN_GAP
    if (maxY - y <= CALCULATOR_SNAP_DISTANCE) y = maxY

    return { x, y }
  }, [])

  const getNearestCalculatorEdge = useCallback((position: { x: number; y: number }): CalculatorDockEdge => {
    if (typeof window === "undefined") return "right"
    const panelWidth = Math.min(CALCULATOR_PANEL_WIDTH, window.innerWidth - CALCULATOR_SCREEN_GAP * 2)
    const panelHeight = Math.min(CALCULATOR_PANEL_HEIGHT, window.innerHeight - CALCULATOR_SCREEN_GAP * 2)
    const distances = {
      left: position.x,
      right: window.innerWidth - (position.x + panelWidth),
      top: position.y,
      bottom: window.innerHeight - (position.y + panelHeight),
    }
    return (Object.entries(distances).sort((a, b) => a[1] - b[1])[0]?.[0] || "right") as CalculatorDockEdge
  }, [])

  const updateCalculator = useCallback((id: string, updater: (calculator: CalculatorPanelState) => CalculatorPanelState) => {
    setCalculators((current) => current.map((calculator) => (calculator.id === id ? updater(calculator) : calculator)))
  }, [])

  const openCalculator = useCallback(() => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())
    setCalculators((current) => {
      const panelWidth =
        typeof window !== "undefined"
          ? Math.min(CALCULATOR_PANEL_WIDTH, window.innerWidth - CALCULATOR_SCREEN_GAP * 2)
          : CALCULATOR_PANEL_WIDTH
      const offset = Math.min(current.length, 4) * 24
      const position =
        typeof window !== "undefined"
          ? clampCalculatorPosition({
              x: window.innerWidth - panelWidth - 24 - offset,
              y: 80 + offset,
            })
          : { x: 24, y: 80 }

      return [
        ...current,
        {
          id,
          ...position,
          expression: "",
          display: "0",
          history: [],
          view: "keys",
          isDragging: false,
          isDocked: false,
          dockEdge: getNearestCalculatorEdge(position),
        },
      ]
    })
  }, [clampCalculatorPosition, getNearestCalculatorEdge])

  const handleMainAction = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    vibrateTap();
    if (onAddTransaction) {
      onAddTransaction()
    } else {
      setIsDialogOpen(true)
    }
  }, [isExpanded, onAddTransaction, vibrateTap])
  const handleActionClick = useCallback(
    (actionId: string) => {
      setIsExpanded(false)

      switch (actionId) {
        case "lock":
          if (onLockWallet) {
            onLockWallet()
          } else {
            lockApp()
          }
          break
        case "scan":
          setIsReceiptScannerOpen(true)
          break
        case "voice":
          startVoiceRecognition()
          break
        case "calc":
          openCalculator()
          break
        case "convert":
          setIsCurrencyConverterOpen(true)
          break
        case "game":
          setIsGamingPlaceOpen(true)
          break
        case "shift":
          setIsLogShiftOpen(true)
          break
        default:
          setIsDialogOpen(true)
      }
    },
    [onLockWallet, lockApp, openCalculator]
  )

  const setCalculatorInput = useCallback((id: string, value: string) => {
    const normalized = normalizeCalculatorExpression(value)
    updateCalculator(id, (calculator) => ({
      ...calculator,
      expression: normalized,
      display: getCalculatorPreview(normalized),
    }))
  }, [updateCalculator])

  const handleCalculatorButton = useCallback((id: string, value: string) => {
    updateCalculator(id, (calculator) => {
      if (value === "=") {
        const formatted = calculateExpressionResult(calculator.expression)
        const shouldSave =
          formatted !== "Error" &&
          formatted !== "0" &&
          calculator.expression.trim() !== "" &&
          calculator.expression !== formatted
        return {
          ...calculator,
          display: formatted,
          expression: formatted === "Error" ? "" : formatted,
          history: shouldSave
            ? [
                { expression: calculator.expression, result: formatted },
                ...calculator.history.filter((item) => item.expression !== calculator.expression || item.result !== formatted),
              ].slice(0, 5)
            : calculator.history,
        }
      }

      if (value === "C") {
        return { ...calculator, display: "0", expression: "" }
      }

      if (value === "Del") {
        const expression = calculator.expression.slice(0, -1)
        return { ...calculator, expression, display: getCalculatorPreview(expression) }
      }

      const expression = `${calculator.display === "Error" ? "" : calculator.expression}${value}`
      return { ...calculator, expression, display: getCalculatorPreview(expression) }
    })
  }, [updateCalculator])

  const closeCalculator = useCallback((id: string) => {
    setCalculators((current) => current.filter((calculator) => calculator.id !== id))
  }, [])

  const useCalculatorHistoryItem = useCallback((id: string, item: { expression: string; result: string }) => {
    updateCalculator(id, (calculator) => ({
      ...calculator,
      expression: item.result,
      display: item.result,
    }))
  }, [updateCalculator])

  const clearCalculatorHistory = useCallback((id: string) => {
    updateCalculator(id, (calculator) => ({ ...calculator, history: [], view: "keys" }))
  }, [updateCalculator])

  const setCalculatorView = useCallback((id: string, view: CalculatorPanelState["view"]) => {
    updateCalculator(id, (calculator) => ({ ...calculator, view }))
  }, [updateCalculator])

  const handleCalculatorKeyDown = useCallback((id: string, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "=") {
      event.preventDefault()
      handleCalculatorButton(id, "=")
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      closeCalculator(id)
    }
  }, [closeCalculator, handleCalculatorButton])

  const handleCalculatorDragStart = useCallback((id: string, event: PointerEvent<HTMLDivElement>) => {
    if (isMobile) return
    const calculator = calculators.find((item) => item.id === id)
    if (!calculator || calculator.isDocked) return
    event.currentTarget.setPointerCapture(event.pointerId)
    calculatorDragRef.current = {
      id,
      offsetX: event.clientX - calculator.x,
      offsetY: event.clientY - calculator.y,
    }
    updateCalculator(id, (item) => ({ ...item, isDragging: true }))
  }, [calculators, isMobile, updateCalculator])

  const handleCalculatorDragMove = useCallback((id: string, event: PointerEvent<HTMLDivElement>) => {
    if (isMobile || calculatorDragRef.current?.id !== id) return
    const position = clampCalculatorPosition({
      x: event.clientX - calculatorDragRef.current.offsetX,
      y: event.clientY - calculatorDragRef.current.offsetY,
    })
    updateCalculator(id, (calculator) => ({
      ...calculator,
      ...position,
      dockEdge: getNearestCalculatorEdge(position),
    }))
  }, [clampCalculatorPosition, getNearestCalculatorEdge, isMobile, updateCalculator])

  const handleCalculatorDragEnd = useCallback((id: string, event: PointerEvent<HTMLDivElement>) => {
    if (isMobile) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    calculatorDragRef.current = null
    updateCalculator(id, (calculator) => {
      const position = clampCalculatorPosition(calculator)
      return {
        ...calculator,
        ...position,
        isDragging: false,
        dockEdge: getNearestCalculatorEdge(position),
      }
    })
  }, [clampCalculatorPosition, getNearestCalculatorEdge, isMobile, updateCalculator])

  const dockCalculator = useCallback((id: string) => {
    updateCalculator(id, (calculator) => ({
      ...calculator,
      isDocked: true,
      isDragging: false,
      dockEdge: getNearestCalculatorEdge(calculator),
    }))
  }, [getNearestCalculatorEdge, updateCalculator])

  const restoreCalculator = useCallback((id: string) => {
    updateCalculator(id, (calculator) => {
      const panelWidth =
        typeof window !== "undefined"
          ? Math.min(CALCULATOR_PANEL_WIDTH, window.innerWidth - CALCULATOR_SCREEN_GAP * 2)
          : CALCULATOR_PANEL_WIDTH
      const panelHeight =
        typeof window !== "undefined"
          ? Math.min(CALCULATOR_PANEL_HEIGHT, window.innerHeight - CALCULATOR_SCREEN_GAP * 2)
          : CALCULATOR_PANEL_HEIGHT
      const maxX =
        typeof window !== "undefined"
          ? Math.max(CALCULATOR_SCREEN_GAP, window.innerWidth - panelWidth - CALCULATOR_SCREEN_GAP)
          : calculator.x
      const maxY =
        typeof window !== "undefined"
          ? Math.max(CALCULATOR_SCREEN_GAP, window.innerHeight - panelHeight - CALCULATOR_SCREEN_GAP)
          : calculator.y
      const position = clampCalculatorPosition({
        x: calculator.dockEdge === "left" ? CALCULATOR_SCREEN_GAP : calculator.dockEdge === "right" ? maxX : calculator.x,
        y: calculator.dockEdge === "top" ? CALCULATOR_SCREEN_GAP : calculator.dockEdge === "bottom" ? maxY : calculator.y,
      })
      return { ...calculator, ...position, isDocked: false }
    })
  }, [clampCalculatorPosition, updateCalculator])

  useEffect(() => {
    if (calculators.length === 0) return
    const handleResize = () => {
      setCalculators((current) =>
        current.map((calculator) => ({
          ...calculator,
          ...clampCalculatorPosition(calculator),
        })),
      )
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [calculators.length, clampCalculatorPosition])

  // Helper function to parse voice transcript
  const parseVoiceTranscript = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase()

    // Keywords for transaction type detection
    const incomeKeywords = ['income', 'earn', 'received', 'got', 'add money', 'salary', 'bonus', 'freelance', 'gift', 'refund', 'investment', 'dividend']
    const expenseKeywords = ['expense', 'spent', 'pay', 'bought', 'cost', 'paid', 'purchase', 'buy']

    // Detect transaction type
    let transactionType: "income" | "expense" = "expense"
    const hasIncomeKeywords = incomeKeywords.some(keyword => lowerTranscript.includes(keyword))
    const hasExpenseKeywords = expenseKeywords.some(keyword => lowerTranscript.includes(keyword))

    if (hasIncomeKeywords && !hasExpenseKeywords) {
      transactionType = "income"
    } else if (hasExpenseKeywords && !hasIncomeKeywords) {
      transactionType = "expense"
    }

    // Get available categories for the detected type
    const availableCategories = getDefaultCategories(transactionType)

    // Category detection - look for category names in transcript
    let detectedCategory = ""
    for (const category of availableCategories) {
      if (lowerTranscript.includes(category.name.toLowerCase())) {
        detectedCategory = category.name
        break
      }
    }

    // Alternative category detection with common synonyms
    if (!detectedCategory) {
      const categorySynonyms: Record<string, string> = {
        'food': 'Food & Dining',
        'restaurant': 'Food & Dining',
        'dining': 'Food & Dining',
        'eat': 'Food & Dining',
        'lunch': 'Food & Dining',
        'dinner': 'Food & Dining',
        'supermarket': 'Groceries',
        'grocery': 'Groceries',
        'shopping': 'Shopping',
        'clothes': 'Shopping',
        'gas': 'Transportation',
        'fuel': 'Transportation',
        'car': 'Transportation',
        'bus': 'Transportation',
        'taxi': 'Transportation',
        'uber': 'Transportation',
        'rent': 'Housing',
        'house': 'Housing',
        'apartment': 'Housing',
        'electricity': 'Bills & Utilities',
        'water': 'Bills & Utilities',
        'internet': 'Bills & Utilities',
        'phone': 'Bills & Utilities',
        'doctor': 'Healthcare',
        'medical': 'Healthcare',
        'hospital': 'Healthcare',
        'movie': 'Entertainment',
        'cinema': 'Entertainment',
        'game': 'Entertainment',
        'book': 'Education',
        'course': 'Education',
        'school': 'Education',
        'travel': 'Travel',
        'hotel': 'Travel',
        'flight': 'Travel',
        'insurance': 'Insurance'
      }

      for (const [synonym, category] of Object.entries(categorySynonyms)) {
        if (lowerTranscript.includes(synonym)) {
          const categoryExists = availableCategories.some(cat => cat.name === category)
          if (categoryExists) {
            detectedCategory = category
            break
          }
        }
      }
    }

    // Parse number from transcript, handling commas
    const numberMatch = transcript.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/)
    let amount = ""
    if (numberMatch) {
      amount = numberMatch[1].replace(/,/g, '')
    }

    // Clean description by removing detected elements and common words
    let cleanedDescription = transcript
      .replace(numberMatch ? numberMatch[0] : '', '') // Remove the number
      .replace(/\b(dollars?|bucks?|usd|money|amount|for|to|at|with|and|the|a|an|add|remove|expense|income|spent|paid|bought|received|got|earned|salary|bonus|freelance|gift|refund|investment|dividend|food|restaurant|grocery|shopping|transportation|entertainment|healthcare|education|travel|housing|insurance|bills|utilities|other|category|transaction|eat|lunch|dinner|supermarket|clothes|gas|fuel|car|bus|taxi|uber|rent|house|apartment|electricity|water|internet|phone|doctor|medical|hospital|movie|cinema|game|book|course|school|hotel|flight)\b/gi, '') // Remove common filler words and detected keywords
      .trim()

    // Remove detected category if found
    if (detectedCategory) {
      cleanedDescription = cleanedDescription.replace(new RegExp(`\\b${detectedCategory.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi'), '')
    }

    // Clean up extra spaces and punctuation
    cleanedDescription = cleanedDescription.replace(/\s+/g, ' ').replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim()

    return {
      amount,
      transactionType,
      category: detectedCategory,
      fullDescription: transcript.trim(),
      cleanedDescription
    }
  }, [])

  const startVoiceRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice recognition not supported in this browser")
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      toast.info("Listening... Say something like 'spent 50 dollars at restaurant' or 'received 1000 salary'")
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript

      const parsed = parseVoiceTranscript(transcript)

      if (parsed.amount) {
        setPrefilledAmount(parsed.amount)
        setPrefilledType(parsed.transactionType)
        setPrefilledDescription(parsed.cleanedDescription || parsed.fullDescription)

        if (parsed.category) {
          setPrefilledCategory(parsed.category)
        }

        setIsDialogOpen(true)

        const typeText = parsed.transactionType === 'income' ? 'Income' : 'Expense'
        const categoryText = parsed.category ? ` in ${parsed.category}` : ''
        const descText = parsed.cleanedDescription ? ` - ${parsed.cleanedDescription}` : ''
        toast.success(`${typeText} of $${parsed.amount}${categoryText}${descText}`)
      } else {
        toast.error("No amount detected in speech. Try saying something like '50 dollars at restaurant'")
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error)
      toast.error("Voice recognition error. Please try again.")
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }, [parseVoiceTranscript])

  const handleReceiptData = useCallback((data: any) => {
    setPrefilledAmount(data.amount)
    setPrefilledType(data.type)
    setPrefilledDescription(data.description)
    setPrefilledCategory(data.category)
    setPrefilledReceiptImage(data.receiptImage || "")
    setIsReceiptScannerOpen(false)
    setIsDialogOpen(true)
    toast.success(`Receipt scanned! Amount: $${data.amount}`)
  }, [])

  const handleUseResult = useCallback((calculator: CalculatorPanelState) => {
    const result =
      /^-?\d+(?:\.\d+)?$/.test(calculator.display)
        ? calculator.display
        : calculateExpressionResult(calculator.expression)

    if (result === "Error" || result === "0") {
      updateCalculator(calculator.id, (item) => ({ ...item, display: result }))
      return
    }

    setPrefilledAmount(result)
    closeCalculator(calculator.id)
    setIsDialogOpen(true)
  }, [closeCalculator, updateCalculator])

  return (
    <>
      {/* Mobile Expanded Actions */}
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        >
          <div className="absolute bottom-[152px] right-6 flex flex-col gap-3">
            {quickActions.map((action, index) => {
              const actionData =
                action.id === "voice" ? getVoiceAction(isListening) : action
              return (
                <Button
                  key={action.id}
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleActionClick(action.id)
                  }}
                  className={cn(
                    "h-12 w-12 rounded-full shadow-xl transition-all duration-300",
                    "hover:scale-110 active:scale-95",
                    "bg-opacity-90 text-white",
                    actionData.color,
                    "animate-in slide-in-from-bottom-2 fade-in-0"
                  )}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <actionData.icon className="h-5 w-5" />
                  <span className="sr-only">{actionData.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main FAB */}
      <Button
        onClick={handleMainAction}
        onMouseEnter={vibrateHold}
        onTouchStart={() => {
          if (isMobile) {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              setIsExpanded(true);
              vibrateHold();
            }, 500);
          }
        }}
        onTouchEnd={() => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }}
        size="icon"
        className={cn(
          "fixed right-6 h-14 w-14 rounded-full z-50 flex items-center justify-center",
          "bg-primary text-white shadow-2xl backdrop-blur-sm",
          "transition-all duration-300 ease-out",
          "hover:scale-110 hover:shadow-primary/40 active:scale-95",
          isMobile ? "bottom-20" : "bottom-6",
          className
        )}
      >
        <Plus
          className={cn(
            "h-6 w-6 transition-transform duration-300",
            isExpanded && "rotate-45"
          )}
        />
      </Button>

      {/* Desktop Hover Quick Menu */}
      {!isMobile && isAuthenticated && (
        <div className="fixed bottom-6 right-20 z-40 group">
          <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex gap-2">
            {quickActions.map((action) => {
              const actionData =
                action.id === "voice" ? getVoiceAction(isListening) : action
              return (
                <Button
                  key={action.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => handleActionClick(action.id)}
                  className={cn(
                    "h-10 px-3 rounded-xl shadow-md backdrop-blur-sm",
                    "hover:shadow-lg transition-all duration-300"
                  )}
                >
                  <actionData.icon className="h-4 w-4 mr-2" />
                  {actionData.label}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction Dialog */}
      <UnifiedTransactionDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setPrefilledAmount("")
            setPrefilledDescription("")
            setPrefilledType("expense")
            setPrefilledCategory("")
            setPrefilledReceiptImage("")
          }
        }}
        initialAmount={prefilledAmount}
        initialDescription={prefilledDescription}
        initialType={prefilledType}
        initialCategory={prefilledCategory}
        initialReceiptImage={prefilledReceiptImage}
      />

      {/* Calculator Panels */}
      {calculators.map((calculator, index) => {
        const dockIcon =
          calculator.dockEdge === "left" ? <ChevronRight className="h-5 w-5" /> :
          calculator.dockEdge === "right" ? <ChevronLeft className="h-5 w-5" /> :
          calculator.dockEdge === "top" ? <ChevronDown className="h-5 w-5" /> :
          <ChevronUp className="h-5 w-5" />

        if (calculator.isDocked) {
          const dockStyle =
            calculator.dockEdge === "left"
              ? { left: 0, top: calculator.y }
              : calculator.dockEdge === "right"
                ? { right: 0, top: calculator.y }
                : calculator.dockEdge === "top"
                  ? { left: calculator.x, top: 0 }
                  : { left: calculator.x, bottom: 0 }

          return (
            <button
              key={calculator.id}
              type="button"
              className={cn(
                "fixed z-[70] flex items-center justify-center border bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 active:scale-95",
                calculator.dockEdge === "left" && "h-14 w-9 rounded-r-xl border-l-0",
                calculator.dockEdge === "right" && "h-14 w-9 rounded-l-xl border-r-0",
                calculator.dockEdge === "top" && "h-9 w-14 rounded-b-xl border-t-0",
                calculator.dockEdge === "bottom" && "h-9 w-14 rounded-t-xl border-b-0",
              )}
              style={dockStyle}
              onClick={() => restoreCalculator(calculator.id)}
              aria-label="Restore calculator"
              title="Restore calculator"
            >
              {dockIcon}
            </button>
          )
        }

        return (
          <div
            key={calculator.id}
            className={cn(
              "fixed z-[70] w-[calc(100vw_-_2rem)] max-w-sm rounded-2xl border bg-background shadow-2xl ring-1 ring-border/50",
              "sm:w-96",
              calculator.isDragging && "select-none shadow-primary/20"
            )}
            style={
              isMobile
                ? { left: 16, right: 16, bottom: 96 + index * 12 }
                : { left: calculator.x, top: calculator.y }
            }
          >
            <div
              className={cn(
                "flex items-center justify-between gap-2 border-b px-4 py-3",
                !isMobile && "cursor-grab active:cursor-grabbing"
              )}
              onPointerDown={(event) => handleCalculatorDragStart(calculator.id, event)}
              onPointerMove={(event) => handleCalculatorDragMove(calculator.id, event)}
              onPointerUp={(event) => handleCalculatorDragEnd(calculator.id, event)}
              onPointerCancel={(event) => handleCalculatorDragEnd(calculator.id, event)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Calculator className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h2 className="text-sm font-bold leading-tight">Quick Calculator</h2>
                  <p className="hidden text-[11px] text-muted-foreground sm:block">Drag to move. Dock to edges.</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isMobile && <GripHorizontal className="h-4 w-4 text-muted-foreground" />}
                {!isMobile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => dockCalculator(calculator.id)}
                    aria-label="Dock calculator to edge"
                    title="Dock calculator"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => closeCalculator(calculator.id)}
                  aria-label="Close calculator"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="rounded-xl border bg-muted/30 p-3 shadow-inner">
                <Input
                  value={calculator.expression}
                  onChange={(event) => setCalculatorInput(calculator.id, event.target.value)}
                  onKeyDown={(event) => handleCalculatorKeyDown(calculator.id, event)}
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Calculator expression"
                  className="h-12 border-0 bg-transparent px-0 text-right font-mono text-2xl font-bold shadow-none focus-visible:ring-0"
                  placeholder="0"
                />
                <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                  <span>Live result</span>
                  <span className="max-w-[220px] truncate font-mono text-foreground">{calculator.display}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 rounded-xl border bg-muted/20 p-1">
                <Button
                  type="button"
                  variant={calculator.view === "keys" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => setCalculatorView(calculator.id, "keys")}
                >
                  Keys
                </Button>
                <Button
                  type="button"
                  variant={calculator.view === "history" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => setCalculatorView(calculator.id, "history")}
                  disabled={calculator.history.length === 0}
                >
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  History
                  {calculator.history.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                      {calculator.history.length}
                    </span>
                  )}
                </Button>
              </div>

              {calculator.view === "history" ? (
                <div className="min-h-[248px] rounded-xl border bg-muted/15 p-2">
                  {calculator.history.length > 0 ? (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <History className="h-3.5 w-3.5" />
                          Recent calculations
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => clearCalculatorHistory(calculator.id)}
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {calculator.history.map((item, historyIndex) => (
                          <button
                            key={`${item.expression}-${item.result}-${historyIndex}`}
                            type="button"
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-muted"
                            onClick={() => useCalculatorHistoryItem(calculator.id, item)}
                            title="Use this result"
                          >
                            <span className="min-w-0 truncate font-mono text-muted-foreground">{item.expression}</span>
                            <span className="shrink-0 font-mono font-semibold text-foreground">{item.result}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full min-h-[232px] flex-col items-center justify-center text-center text-xs text-muted-foreground">
                      <History className="mb-2 h-6 w-6 opacity-60" />
                      Run a calculation to save history.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-5 gap-2">
                    {calculatorButtons.map((btn, buttonIndex) => (
                      <Button
                        key={btn}
                        variant={btn === "=" ? "default" : "outline"}
                        size="lg"
                        onClick={() => handleCalculatorButton(calculator.id, btn)}
                        className={cn(
                          "h-12 rounded-xl text-lg font-semibold transition-all duration-150 ease-out",
                          "hover:scale-105 hover:shadow-md active:scale-95 active:shadow-sm",
                          "focus:ring-2 focus:ring-primary/20 focus:outline-none",
                          (btn === "C" || btn === "Del") && "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20",
                          ["/", "*", "+", "-", "%"].includes(btn) && "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
                          btn === "=" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg",
                          "animate-in slide-in-from-bottom-1 fade-in-0"
                        )}
                        style={{ animationDelay: `${buttonIndex * 20}ms` }}
                        aria-label={`Calculator button ${btn}`}
                      >
                        {btn}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCalculatorButton(calculator.id, "C")}
                      className="rounded-xl"
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={() => handleUseResult(calculator)}
                      className={cn(
                        "rounded-xl transition-all duration-200 ease-out",
                        "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      )}
                      disabled={calculator.display === "0" || calculator.display === "Error" || calculator.display === "..."}
                    >
                      Use Result
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}
      <CurrencyConverterDialog
        isOpen={isCurrencyConverterOpen}
        onOpenChange={setIsCurrencyConverterOpen}
      />

      {/* Receipt Scanner */}
      <ReceiptScanner
        isOpen={isReceiptScannerOpen}
        onOpenChange={setIsReceiptScannerOpen}
        onTransactionData={handleReceiptData}
      />

      {/* Gaming Place Modal */}
      <GamingPlaceModal
        isOpen={isGamingPlaceOpen}
        onClose={() => setIsGamingPlaceOpen(false)}
      />

      <LogShiftDialog
        open={isLogShiftOpen}
        onOpenChange={setIsLogShiftOpen}
        onSave={(shift) => {
          if (appendShiftToStorage(shift)) {
            toast.success("Shift saved");
            return true;
          }
          toast.error("Could not save shift");
          return false;
        }}
      />
    </>
  )
}
