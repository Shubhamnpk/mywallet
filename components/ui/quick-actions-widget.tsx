"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  Receipt,
  Target,
  PiggyBank,
  TrendingUp,
  X,
  Camera,
  Mic,
  Calculator
} from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void
  color: string
}

export function QuickActionsWidget() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { balance } = useWalletData()

  const quickActions: QuickAction[] = [
    {
      id: 'add-transaction',
      label: 'Add Transaction',
      icon: <Plus className="w-4 h-4" />,
      action: () => {
        // Trigger transaction dialog
        console.log('Add transaction')
        setIsExpanded(false)
      },
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'scan-receipt',
      label: 'Scan Receipt',
      icon: <Camera className="w-4 h-4" />,
      action: () => {
        // Trigger receipt scanning
        console.log('Scan receipt')
        setIsExpanded(false)
      },
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'voice-command',
      label: 'Voice Command',
      icon: <Mic className="w-4 h-4" />,
      action: () => {
        // Trigger voice command
        console.log('Voice command')
        setIsExpanded(false)
      },
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'quick-calc',
      label: 'Quick Calc',
      icon: <Calculator className="w-4 h-4" />,
      action: () => {
        // Open calculator
        console.log('Quick calculator')
        setIsExpanded(false)
      },
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ]

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      {/* Expanded Actions */}
      {isExpanded && (
        <Card className="mb-2 p-2 shadow-lg">
          <CardContent className="p-2">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  onClick={action.action}
                  className="flex flex-col items-center gap-1 h-auto p-3"
                >
                  <div className={`p-2 rounded-full ${action.color} text-white`}>
                    {action.icon}
                  </div>
                  <span className="text-xs text-center">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main FAB */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${
          isExpanded ? 'rotate-45' : ''
        }`}
        size="lg"
      >
        {isExpanded ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </Button>
    </div>
  )
}