"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import QRCode from "react-qr-code"
import { Share2, Facebook, Twitter, MessageCircle, Copy, Check, X, Link2, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [showQR, setShowQR] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.origin)
    }
  }, [])

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: "✓ Copied!",
        description: "Link copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy URL. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSocialShare = (platform: string) => {
    const text = "Check out MyWallet - Your Personal Finance Manager!"
    const url = encodeURIComponent(shareUrl)

    let shareLink = ""
    switch (platform) {
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`
        break
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`
        break
      case "whatsapp":
        shareLink = `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`
        break
      default:
        return
    }

    window.open(shareLink, "_blank", "width=600,height=400")
  }

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MyWallet - Personal Finance Manager",
          text: "Check out MyWallet - Your Personal Finance Manager!",
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      handleCopyUrl()
    }
  }

  const modalContent = (
    <ScrollArea className="relative h-full">
       <div className="flex flex-col gap-8 p-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent mb-2">
            <Share2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Share MyWallet
          </DialogTitle>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Help your friends take control of their finances
          </p>
        </div>

        {/* Quick Share Button */}
        <Button
          onClick={handleWebShare}
          size="lg"
          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Quick Share
        </Button>

        {/* QR Code Section */}
        {showQR && (
          <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-muted to-muted/50 rounded-2xl border border-border animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm font-medium text-foreground">Scan to open</p>
            <div className="bg-background p-4 rounded-xl shadow-lg border border-border">
              <QRCode value={shareUrl} size={180} />
            </div>
            <p className="text-xs text-muted-foreground">Point your camera at this code</p>
          </div>
        )}

        {/* Social Share Options */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Or share via
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialShare("facebook")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-border hover:border-primary/20 hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Facebook className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Facebook</span>
            </button>
            <button
              onClick={() => handleSocialShare("twitter")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-border hover:border-primary/20 hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Twitter className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Twitter</span>
            </button>
            <button
              onClick={() => handleSocialShare("whatsapp")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-border hover:border-primary/20 hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Copy Link Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Copy Link
            </p>
            <button
              onClick={() => setShowQR(!showQR)}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {showQR ? "Hide QR" : "Show QR Code"}
            </button>
          </div>
          
          <div className="flex items-center gap-2 p-2 pr-3 bg-muted rounded-xl border border-border">
            <div className="flex items-center gap-2 flex-1 min-w-0 px-3">
              <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={shareUrl}
                readOnly
                aria-label="App URL"
                className="flex-1 bg-transparent text-sm text-foreground outline-none min-w-0"
              />
            </div>
            <Button
              onClick={handleCopyUrl}
              size="sm"
              className={`flex-shrink-0 ${copied ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
        </div>
    </ScrollArea>
  )

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg p-0 gap-0 border-0 overflow-hidden">
          {modalContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 border-l-0">
        {modalContent}
      </SheetContent>
    </Sheet>
  )
}