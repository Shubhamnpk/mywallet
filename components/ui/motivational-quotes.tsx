"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Quote, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const motivationalQuotes = [
  {
    text: "Time is money—spend wisely!",
    author: "Benjamin Franklin",
  },
  {
    text: "Every minute you save is a minute you earn.",
    author: "MyWallet Wisdom",
  },
  {
    text: "Small expenses, when tracked, reveal big insights.",
    author: "Financial Mindfulness",
  },
  {
    text: "Your time is your most valuable currency.",
    author: "Time Investment Theory",
  },
  {
    text: "Conscious spending leads to conscious living.",
    author: "Mindful Money",
  },
  {
    text: "Track your time, track your wealth.",
    author: "MyWallet Philosophy",
  },
  {
    text: "Every dollar spent is time invested—make it count.",
    author: "Value-Based Spending",
  },
  {
    text: "Financial awareness is the first step to financial freedom.",
    author: "Money Mindset",
  },
  {
    text: "Your wallet reflects your priorities.",
    author: "Spending Psychology",
  },
  {
    text: "Time-conscious spending creates wealth-conscious living.",
    author: "MyWallet Insight",
  },
]

export function MotivationalQuotes() {
  const [currentQuote, setCurrentQuote] = useState(0)

  useEffect(() => {
    // Change quote every 30 seconds
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const nextQuote = () => {
    setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length)
  }

  const quote = motivationalQuotes[currentQuote]

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Quote className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">"{quote.text}"</p>
            <p className="text-xs text-muted-foreground">— {quote.author}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextQuote}
            className="h-8 w-8 text-primary hover:text-primary"
            aria-label="Next quote"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
