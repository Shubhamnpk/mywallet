"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import QRCode from "react-qr-code"
import { Share2, Facebook, Twitter, MessageCircle, Copy, Check } from "lucide-react"
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
        title: "URL Copied!",
        description: "The app URL has been copied to your clipboard.",
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
    <>
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Share MyWallet</h2>
          <p className="text-muted-foreground">
            Share your personal finance manager with friends and family!
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg">
          <QRCode value={shareUrl} size={200} />
        </div>

        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={shareUrl}
              readOnly
              aria-label="App URL"
              className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
            />
            <Button onClick={handleCopyUrl} size="sm" variant="outline">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <Button onClick={handleWebShare} className="w-full mb-4" size="lg">
            <Share2 className="w-4 h-4 mr-2" />
            Share via...
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => handleSocialShare("facebook")}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              <span className="text-xs">Facebook</span>
            </Button>
            <Button
              onClick={() => handleSocialShare("twitter")}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Twitter className="w-5 h-5 text-blue-400" />
              <span className="text-xs">Twitter</span>
            </Button>
            <Button
              onClick={() => handleSocialShare("whatsapp")}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="text-xs">WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-none w-full h-full max-h-none rounded-none">
          <DialogHeader>
            <DialogTitle>Share MyWallet</DialogTitle>
          </DialogHeader>
          {modalContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Share MyWallet</SheetTitle>
        </SheetHeader>
        {modalContent}
      </SheetContent>
    </Sheet>
  )
}
