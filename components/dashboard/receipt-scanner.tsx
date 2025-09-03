"use client"

import React, { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Camera, Upload, Scan, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getDefaultCategories } from "@/lib/categories"

interface ReceiptScannerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTransactionData: (data: TransactionData) => void
}

interface TransactionData {
  amount: string
  description: string
  category: string
  type: "income" | "expense"
  date?: string
  receiptImage?: string
}

interface ExtractedData {
  amount: string
  merchant: string
  date: string
  items: string[]
  total: string
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  isOpen,
  onOpenChange,
  onTransactionData
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize Tesseract.js for OCR
  const loadTesseract = async () => {
    try {
      const { createWorker } = await import('tesseract.js')
      return await createWorker('eng')
    } catch (error) {
      console.error('Failed to load Tesseract:', error)
      throw new Error('OCR functionality not available')
    }
  }

  // Extract text from image using OCR
  const extractTextFromImage = async (imageData: string): Promise<string> => {
    const worker = await loadTesseract()

    try {
      const { data: { text } } = await worker.recognize(imageData)
      await worker.terminate()
      return text
    } catch (error) {
      await worker.terminate()
      throw error
    }
  }

  // Parse extracted text for receipt data
  const parseReceiptText = (text: string): ExtractedData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    let amount = ''
    let merchant = ''
    let date = ''
    let items: string[] = []
    let total = ''

    // Common patterns for receipt parsing
    const amountPatterns = [
      /\btotal[:\s]*\$?(\d+(?:\.\d{2})?)/i,
      /\bamount[:\s]*\$?(\d+(?:\.\d{2})?)/i,
      /\bbalance[:\s]*\$?(\d+(?:\.\d{2})?)/i,
      /\$\s*(\d+(?:\.\d{2})?)/g,
      /(\d+(?:\.\d{2})?)\s*\$/g
    ]

    const datePatterns = [
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g,
      /(\d{2,4}[-\/]\d{1,2}[-\/]\d{1,2})/g,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{2,4}/gi
    ]

    // Extract merchant name (usually first non-empty line)
    if (lines.length > 0) {
      merchant = lines[0].replace(/[^\w\s&'-]/g, '').trim()
    }

    // Extract amounts
    for (const line of lines) {
      for (const pattern of amountPatterns) {
        const matches = line.match(pattern)
        if (matches) {
          for (const match of matches) {
            const extractedAmount = match.replace(/[^\d.]/g, '')
            if (extractedAmount && parseFloat(extractedAmount) > 0) {
              if (line.toLowerCase().includes('total') || line.toLowerCase().includes('balance')) {
                total = extractedAmount
                amount = extractedAmount
              } else if (!amount || parseFloat(extractedAmount) > parseFloat(amount)) {
                amount = extractedAmount
              }
            }
          }
        }
      }

      // Extract date
      for (const pattern of datePatterns) {
        const matches = line.match(pattern)
        if (matches && !date) {
          date = matches[0]
          break
        }
      }

      // Extract items (lines that might be products)
      if (line.length > 3 && line.length < 50 &&
          !line.toLowerCase().includes('total') &&
          !line.toLowerCase().includes('tax') &&
          !line.toLowerCase().includes('subtotal') &&
          !/^\d{1,2}[-\/]\d{1,2}/.test(line) && // Not a date
          !/^\$?\d+(?:\.\d{2})?$/.test(line.trim())) { // Not just a price
        items.push(line)
      }
    }

    // Fallback for amount if not found
    if (!amount && total) {
      amount = total
    }

    return {
      amount: amount || '',
      merchant: merchant || 'Unknown Merchant',
      date: date || new Date().toLocaleDateString(),
      items: items.slice(0, 5), // Limit to 5 items
      total: total || amount
    }
  }

  // Determine transaction type and category from extracted data
  const determineTransactionDetails = (data: ExtractedData): Omit<TransactionData, 'receiptImage'> => {
    const lowerMerchant = data.merchant.toLowerCase()
    const lowerItems = data.items.join(' ').toLowerCase()

    // Category detection based on merchant and items
    const categoryMappings: Record<string, string> = {
      'restaurant': 'Food & Dining',
      'cafe': 'Food & Dining',
      'diner': 'Food & Dining',
      'pizza': 'Food & Dining',
      'burger': 'Food & Dining',
      'taco': 'Food & Dining',
      'sushi': 'Food & Dining',
      'starbucks': 'Food & Dining',
      'mcdonalds': 'Food & Dining',
      'subway': 'Food & Dining',

      'grocery': 'Groceries',
      'supermarket': 'Groceries',
      'walmart': 'Groceries',
      'target': 'Groceries',
      'safeway': 'Groceries',
      'kroger': 'Groceries',
      'whole foods': 'Groceries',

      'gas': 'Transportation',
      'fuel': 'Transportation',
      'shell': 'Transportation',
      'chevron': 'Transportation',
      'exxon': 'Transportation',
      'bp': 'Transportation',

      'pharmacy': 'Healthcare',
      'cvs': 'Healthcare',
      'walgreens': 'Healthcare',
      'rite aid': 'Healthcare',

      'amazon': 'Shopping',
      'best buy': 'Shopping',
      'home depot': 'Shopping',
      'lowes': 'Shopping',
      'ikea': 'Shopping',

      'netflix': 'Entertainment',
      'spotify': 'Entertainment',
      'hulu': 'Entertainment',
      'disney': 'Entertainment',

      'electric': 'Bills & Utilities',
      'water': 'Bills & Utilities',
      'internet': 'Bills & Utilities',
      'cable': 'Bills & Utilities',
      'phone': 'Bills & Utilities'
    }

    let detectedCategory = 'Other'
    const searchText = lowerMerchant + ' ' + lowerItems

    for (const [keyword, category] of Object.entries(categoryMappings)) {
      if (searchText.includes(keyword)) {
        detectedCategory = category
        break
      }
    }

    // Create description from merchant and items
    const description = data.merchant +
      (data.items.length > 0 ? ` - ${data.items.slice(0, 2).join(', ')}` : '') +
      (data.items.length > 2 ? '...' : '')

    return {
      amount: data.amount,
      description: description.trim(),
      category: detectedCategory,
      type: 'expense' as const, // Receipts are typically expenses
      date: data.date
    }
  }

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
        setExtractedData(null)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  // Handle camera capture
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      toast.error('Camera access denied. Please allow camera permissions.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      setIsCameraActive(false)
    }
  }, [])

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setSelectedImage(imageData)
        setExtractedData(null)
        stopCamera()
      }
    }
  }, [stopCamera])

  // Process the selected image
  const processImage = useCallback(async () => {
    if (!selectedImage) return

    setIsProcessing(true)
    try {
      toast.info('Extracting text from receipt...')

      const extractedText = await extractTextFromImage(selectedImage)
      console.log('Extracted text:', extractedText)

      const parsedData = parseReceiptText(extractedText)
      console.log('Parsed data:', parsedData)

      setExtractedData(parsedData)

      toast.success('Receipt processed successfully!')
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Failed to process receipt. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [selectedImage])

  // Confirm and use the extracted data
  const confirmTransaction = useCallback(() => {
    if (!extractedData) return

    const transactionData = determineTransactionDetails(extractedData)
    const finalData: TransactionData = {
      ...transactionData,
      receiptImage: selectedImage || undefined
    }

    onTransactionData(finalData)
    onOpenChange(false)

    // Reset state
    setSelectedImage(null)
    setExtractedData(null)
    setIsCameraActive(false)
  }, [extractedData, selectedImage, onTransactionData, onOpenChange])

  // Reset everything
  const resetScanner = useCallback(() => {
    setSelectedImage(null)
    setExtractedData(null)
    setIsCameraActive(false)
    stopCamera()
  }, [stopCamera])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Receipt Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Selection */}
          {!selectedImage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Receipt Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                  >
                    <Upload className="w-6 h-6" />
                    Upload Image
                  </Button>

                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                  >
                    <Camera className="w-6 h-6" />
                    Take Photo
                  </Button>
                </div>

                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>
          )}

          {/* Camera View */}
          {isCameraActive && (
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <canvas ref={canvasRef} className="hidden" />

