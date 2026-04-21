"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Archive, Trash2, Package, EyeOff } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type { ShareTransaction } from "@/types/wallet"
import { normalizeStockSymbol } from "@/lib/stock-symbol"

interface SellConfirmationModalProps {
  symbol: string
  assetType?: "stock" | "crypto"
  cryptoId?: string
  portfolioId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmKeep: () => void
  onConfirmRemove: () => void
  onDisableZeroHoldings?: () => void
  shareTransactions: ShareTransaction[]
  zeroHoldingsEnabled?: boolean
}

export function SellConfirmationModal({
  symbol,
  assetType = "stock",
  cryptoId,
  portfolioId,
  open,
  onOpenChange,
  onConfirmKeep,
  onConfirmRemove,
  onDisableZeroHoldings,
  shareTransactions,
  zeroHoldingsEnabled = true,
}: SellConfirmationModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const normalizedSymbol = normalizeStockSymbol(symbol)

  // Find the last sell transaction for this holding
  const lastSellInfo = useMemo(() => {
    const relevantTxs = shareTransactions.filter(
      (tx) =>
        tx.portfolioId === portfolioId &&
        normalizeStockSymbol(tx.symbol) === normalizedSymbol &&
        tx.assetType === assetType &&
        (tx.cryptoId || "") === (cryptoId || "")
    )

    const sellTxs = relevantTxs
      .filter((tx) => tx.type === "sell" || tx.type === "merger_out")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const lastSell = sellTxs[0]
    if (!lastSell) return null

    return {
      date: new Date(lastSell.date).toLocaleDateString(),
      price: lastSell.price,
      quantity: lastSell.quantity,
    }
  }, [shareTransactions, portfolioId, normalizedSymbol, assetType, cryptoId])

  const isCrypto = assetType === "crypto" || Boolean(cryptoId)
  const currencySymbol = isCrypto ? "$" : "रु"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
              {isCrypto ? "Crypto Sold" : "Stock Sold"}
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-left">
            All Units Sold
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-left text-muted-foreground">
            You have sold all units of <span className="font-bold text-foreground">{symbol}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          {lastSellInfo && (
            <div className="rounded-2xl border border-muted/30 bg-muted/10 p-4 space-y-3">
              {/* Last Sold Price with per unit note */}
              <div className="flex items-end justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Last Sold Price
                </span>
                <div className="text-right">
                  <span className="text-xl font-black text-foreground">
                    {currencySymbol} {lastSellInfo.price.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    per unit
                  </p>
                </div>
              </div>

              {/* Units and Date */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Units Sold
                </span>
                <span className="text-sm font-bold">{lastSellInfo.quantity} units on {lastSellInfo.date}</span>
              </div>

              {/* Total Amount - Highlighted */}
              <div className="border-t border-muted/30 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Total Amount
                  </span>
                  <span className="text-2xl font-black text-primary">
                    {currencySymbol} {(lastSellInfo.price * lastSellInfo.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-left">
            Would you like to keep this as a zero-unit holding in your portfolio for reference?
          </p>
        </div>

        {zeroHoldingsEnabled && (
          <div className="px-6 pb-3 flex items-center gap-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => {
                setDontShowAgain(checked as boolean)
                if (checked && onDisableZeroHoldings) {
                  onDisableZeroHoldings()
                }
              }}
            />
            <label
              htmlFor="dontShowAgain"
              className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-1.5"
            >
              <EyeOff className="w-3 h-3" />
              Don't show this again (auto-keep zero holdings)
            </label>
          </div>
        )}

        <div className="p-6 pt-2 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onConfirmRemove()
              onOpenChange(false)
            }}
            className="h-12 rounded-xl font-bold border-muted-foreground/20 hover:bg-muted"
          >
            <Trash2 className="w-4 h-4 mr-2 text-muted-foreground" />
            Remove
          </Button>
          <Button
            onClick={() => {
              onConfirmKeep()
              onOpenChange(false)
            }}
            className="h-12 rounded-xl font-bold bg-primary hover:bg-primary/90"
          >
            <Archive className="w-4 h-4 mr-2" />
            Keep
          </Button>
        </div>

        <div className="px-6 pb-6 pt-0">
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground/70">
            <Package className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <p className="text-left">
              Keeping it allows you to track the current market price vs your sold price. 
              Removing it hides it from your portfolio view (transaction history is always preserved).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
