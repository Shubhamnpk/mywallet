"use client"

import React, { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Camera, Mic, Calculator, Lock } from "lucide-react"
import { UnifiedTransactionDialog } from "./transaction-dialog"
import { useAuthentication } from "@/hooks/use-authentication"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface FloatingAddButtonProps {
  className?: string
  onAddTransaction?: () => void
  onLockWallet?: () => void
}

const quickActions = [
  { id: 'scan', icon: Camera, label: 'Scan', color: 'bg-emerald-500' },
  { id: 'voice', icon: Mic, label: 'Voice', color: 'bg-blue-500' },
  { id: 'calc', icon: Calculator, label: 'Calc', color: 'bg-amber-500' },
  { id: 'lock', icon: Lock, label: 'Lock', color: 'bg-red-500' }
]

const getVoiceAction = (isListening: boolean) => ({
  id: 'voice',
  icon: Mic,
  label: isListening ? 'Listening...' : 'Voice',
  color: isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
})

export function FloatingAddButton({
  className,
  onAddTransaction,
  onLockWallet
}: FloatingAddButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [calculatorValue, setCalculatorValue] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [prefilledAmount, setPrefilledAmount] = useState("")
  const [prefilledDescription, setPrefilledDescription] = useState("")
  const recognitionRef = useRef<any>(null)

  const { isAuthenticated, lockApp } = useAuthentication()
  const isMobile = useIsMobile()

  const handleMainAction = useCallback(() => {
    if (isMobile && isAuthenticated) {
      setIsExpanded(!isExpanded)
    } else {
      onAddTransaction?.() ?? setIsDialogOpen(true)
    }
  }, [isMobile, isAuthenticated, isExpanded, onAddTransaction])

  const handleScanReceipt = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        toast.success(`Receipt "${file.name}" selected for scanning`)
        // Here you would integrate with OCR service
        setPrefilledDescription(`Receipt: ${file.name}`)
        setIsDialogOpen(true)
      }
    }
    input.click()
  }, [])

  const handleVoiceCommand = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      toast.info('Listening... Say something like "Add expense 50 dollars for groceries"')
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      toast.success(`Heard: "${transcript}"`)

      // Parse voice command for amount and description
      const amountMatch = transcript.match(/(\d+(?:\.\d+)?)/)
      const amount = amountMatch ? amountMatch[0] : ""

      // Extract description (remove amount and common words)
      let description = transcript
        .replace(/(\d+(?:\.\d+)?)/g, '')
        .replace(/\b(add|expense|income|spend|paid|cost|buy|bought|purchase|purchased|for|dollars?|bucks?|cash)\b/gi, '')
        .trim()

      if (description.length < 3) {
        description = transcript.replace(/(\d+(?:\.\d+)?)/g, '').trim()
      }

      setPrefilledAmount(amount)
      setPrefilledDescription(description || "Voice transaction")
      setIsDialogOpen(true)
    }

    recognition.onerror = (event: any) => {
      toast.error('Voice recognition error: ' + event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const handleCalculator = useCallback(() => {
    setIsCalculatorOpen(true)
  }, [])

  const handleActionClick = useCallback((actionId: string) => {
    setIsExpanded(false)

    switch (actionId) {
      case 'lock':
        onLockWallet?.() ?? lockApp()
        break
      case 'scan':
        handleScanReceipt()
        break
      case 'voice':
        handleVoiceCommand()
        break
      case 'calc':
        handleCalculator()
        break
      default:
        setIsDialogOpen(true)
    }
  }, [onLockWallet, lockApp, handleScanReceipt, handleVoiceCommand, handleCalculator])

  return (
    <>
      {/* Action Menu - Mobile */}
      {isMobile && isExpanded && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsExpanded(false)}>
          <div className="absolute bottom-[152px] right-6 flex flex-col gap-3">
            {quickActions.map((action, index) => {
              const actionData = action.id === 'voice' ? getVoiceAction(isListening) : action
              return (
                <Button
                  key={action.id}
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleActionClick(action.id)
                  }}
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
                    actionData.color,
                    "hover:scale-110 active:scale-95",
                    "animate-in slide-in-from-bottom-2 fade-in-0"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <actionData.icon className="h-5 w-5 text-white" />
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
        className={cn(
          "fixed right-6 h-14 w-14 rounded-full shadow-lg z-50",
          isMobile ? "bottom-16" : "bottom-6",
          "bg-primary hover:bg-primary/90 transition-all duration-200",
          "hover:scale-105 active:scale-95 hover:shadow-xl",
          className
        )}
        size="icon"
      >
        <Plus 
          className={cn(
            "h-6 w-6 transition-transform duration-200",
            isExpanded && "rotate-45"
          )} 
        />
      </Button>

      {/* Desktop Hover Menu */}
      {!isMobile && isAuthenticated && (
        <div className="fixed bottom-6 right-20 z-40 group">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-2">
            {quickActions.map((action) => {
              const actionData = action.id === 'voice' ? getVoiceAction(isListening) : action
              return (
                <Button
                  key={action.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => handleActionClick(action.id)}
                  className="h-10 px-3 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <actionData.icon className="h-4 w-4 mr-2" />
                  {actionData.label}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <UnifiedTransactionDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            // Clear prefilled data when dialog closes
            setPrefilledAmount("")
            setPrefilledDescription("")
          }
        }}
        initialAmount={prefilledAmount}
        initialDescription={prefilledDescription}
      />

      {/* Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Calculator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="calc-input">Enter calculation</Label>
              <Input
                id="calc-input"
                value={calculatorValue}
                onChange={(e) => setCalculatorValue(e.target.value)}
                placeholder="e.g., 25.50 + 10.25"
                className="text-lg"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '/'].map((btn) => (
                <Button
                  key={btn}
                  variant="outline"
                  onClick={() => setCalculatorValue(prev => prev + btn)}
                >
                  {btn}
                </Button>
              ))}
              {['4', '5', '6', '*'].map((btn) => (
                <Button
                  key={btn}
                  variant="outline"
                  onClick={() => setCalculatorValue(prev => prev + btn)}
                >
                  {btn}
                </Button>
              ))}
              {['1', '2', '3', '-'].map((btn) => (
                <Button
                  key={btn}
                  variant="outline"
                  onClick={() => setCalculatorValue(prev => prev + btn)}
                >
                  {btn}
                </Button>
              ))}
              {['0', '.', '=', '+'].map((btn) => (
                <Button
                  key={btn}
                  variant={btn === '=' ? "default" : "outline"}
                  onClick={() => {
                    if (btn === '=') {
                      try {
                        const result = eval(calculatorValue)
                        setCalculatorValue(result.toString())
                        toast.success(`Result: ${result}`)
                      } catch {
                        toast.error('Invalid calculation')
                      }
                    } else {
                      setCalculatorValue(prev => prev + btn)
                    }
                  }}
                >
                  {btn}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCalculatorValue("")}
                className="flex-1"
              >
                Clear
              </Button>
              <Button
                onClick={() => {
                  const result = eval(calculatorValue)
                  if (!isNaN(result)) {
                    setPrefilledAmount(result.toString())
                    setPrefilledDescription("Calculator transaction")
                    setIsCalculatorOpen(false)
                    setIsDialogOpen(true)
                    toast.success(`Amount ${result} copied to transaction`)
                  } else {
                    toast.error('Invalid calculation result')
                  }
                }}
                className="flex-1"
                disabled={!calculatorValue.trim()}
              >
                Use Amount
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}