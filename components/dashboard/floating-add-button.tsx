"use client"

import React, { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Camera, Mic, Calculator, Lock } from "lucide-react"
import { UnifiedTransactionDialog } from "./transaction-dialog"
import { useAuthentication } from "@/hooks/use-authentication"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { getDefaultCategories, ALL_DEFAULT_CATEGORIES } from "@/lib/categories"
import ReceiptScanner from "./receipt-scanner"

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
  { id: "lock", icon: Lock, label: "Lock", color: "bg-red-500" },
]

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
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [calculatorValue, setCalculatorValue] = useState("")
  const [calculatorDisplay, setCalculatorDisplay] = useState("0")
  const [calculatorExpression, setCalculatorExpression] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [prefilledAmount, setPrefilledAmount] = useState("")
  const [prefilledDescription, setPrefilledDescription] = useState("")
  const [prefilledType, setPrefilledType] = useState<"income" | "expense">("expense")
  const [prefilledCategory, setPrefilledCategory] = useState("")
  const [prefilledReceiptImage, setPrefilledReceiptImage] = useState("")
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false)

  const { isAuthenticated, lockApp } = useAuthentication()
  const isMobile = useIsMobile()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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

  const handleMainAction = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    vibrateTap();
    (onAddTransaction ? onAddTransaction() : setIsDialogOpen(true))
  }, [isExpanded, onAddTransaction, vibrateTap])
  const handleActionClick = useCallback(
    (actionId: string) => {
      setIsExpanded(false)

      switch (actionId) {
        case "lock":
          onLockWallet?.() ?? lockApp()
          break
        case "scan":
          setIsReceiptScannerOpen(true)
          break
        case "voice":
          startVoiceRecognition()
          break
        case "calc":
          setIsCalculatorOpen(true)
          break
        default:
          setIsDialogOpen(true)
      }
    },
    [onLockWallet, lockApp]
  )

  const handleCalculatorButton = useCallback((value: string) => {
    if (value === "=") {
      try {
        // Replace calculator symbols and handle percentage
        const processedExpression = calculatorExpression
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/%/g, "*0.01")
        const result = eval(processedExpression)
        setCalculatorDisplay(result.toString())
        setCalculatorExpression(result.toString())
      } catch {
        setCalculatorDisplay("Error")
        setCalculatorExpression("")
      }
    } else if (value === "C") {
      setCalculatorDisplay("0")
      setCalculatorExpression("")
    } else if (value === "⌫") {
      const newExpression = calculatorExpression.slice(0, -1)
      setCalculatorExpression(newExpression)
      setCalculatorDisplay(newExpression || "0")
    } else {
      const newExpression = calculatorExpression + value
      setCalculatorExpression(newExpression)
      setCalculatorDisplay(newExpression)
    }
  }, [calculatorExpression])

  const handleCalculatorClose = useCallback(() => {
    setIsCalculatorOpen(false)
    setCalculatorDisplay("0")
    setCalculatorExpression("")
  }, [])

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
      console.log('Voice transcript:', transcript)

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

  const handleUseResult = useCallback(() => {
    setPrefilledAmount(calculatorDisplay)
    setIsCalculatorOpen(false)
    setIsDialogOpen(true)
    setCalculatorDisplay("0")
    setCalculatorExpression("")
  }, [calculatorDisplay])

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
          isMobile ? "bottom-16" : "bottom-6",
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

      {/* Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={handleCalculatorClose}>
        <DialogContent className="sm:max-w-sm md:max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle>Quick Calculator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Display */}
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-hidden">
              <div
                className="text-right text-2xl font-mono transition-all duration-200 ease-out transform"
                aria-label="Calculator display"
                style={{
                  minHeight: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end'
                }}
              >
                {calculatorDisplay}
              </div>
            </div>

            {/* Button Grid */}
            <div className="grid grid-cols-5 gap-2">
              {[
                "7", "8", "9", "÷", "⌫",
                "4", "5", "6", "×", "C",
                "1", "2", "3", "+", "%",
                "0", ".", "-", "=",
              ].map((btn, index) => (
                <Button
                  key={btn}
                  variant={btn === "=" ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleCalculatorButton(btn)}
                  className={cn(
                    "h-12 text-lg font-semibold transition-all duration-150 ease-out",
                    "hover:scale-105 hover:shadow-md active:scale-95 active:shadow-sm",
                    "focus:ring-2 focus:ring-primary/20 focus:outline-none",
                    btn === "0" && "col-span-2",
                    (btn === "C" || btn === "⌫") && "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20",
                    btn === "=" && "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:bg-blue-800",
                    "animate-in slide-in-from-bottom-1 fade-in-0"
                  )}
                  style={{ animationDelay: `${index * 20}ms` }}
                  aria-label={`Calculator button ${btn}`}
                >
                  {btn}
                </Button>
              ))}
            </div>

            {/* Use Result Button */}
            <Button
              onClick={handleUseResult}
              className={cn(
                "w-full mt-2 transition-all duration-200 ease-out",
                "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              )}
              disabled={calculatorDisplay === "0" || calculatorDisplay === "Error"}
            >
              Use Result in Transaction
            </Button>

          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Scanner */}
      <ReceiptScanner
        isOpen={isReceiptScannerOpen}
        onOpenChange={setIsReceiptScannerOpen}
        onTransactionData={handleReceiptData}
      />
    </>
  )
}
