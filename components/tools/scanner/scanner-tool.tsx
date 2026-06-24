"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { useWalletData } from "@/contexts/wallet-data-context"
import { todayAdDateKey } from "@/lib/app-calendar"
import ReceiptScannerModal from "./scanner-modal"
import { getCurrencySymbol } from "@/lib/currency"

interface ExtractedData {
  amount: string
  merchant: string
  date: string
  items: string[]
  total: string
}

interface TransactionData {
  amount: string
  description: string
  category: string
  type: "income" | "expense"
  date?: string
  receiptImage?: string
}

export function ScannerTool() {
  const { userProfile, addTransaction } = useWalletData()
  const currencySymbol = getCurrencySymbol(userProfile?.currency || "NPR")

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment')
  const [isInitializingCamera, setIsInitializingCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [])

  const loadTesseract = async () => {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')
    await worker.setParameters({ tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,/- ' })
    return worker
  }

  const extractTextFromImage = async (imageData: string): Promise<string> => {
    const worker = await loadTesseract()
    const { data: { text } } = await worker.recognize(imageData)
    await worker.terminate()
    return text
  }

  const parseReceiptText = (text: string): ExtractedData => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    let amount = '', merchant = '', date = '', total = ''
    const items: string[] = []

    if (lines.length > 0) merchant = lines[0].replace(/[^\w\s&'-]/g, '').trim()
    for (const line of lines) {
      const amtMatch = line.match(/\btotal[:\s]*\$?(\d+(?:\.\d{2})?)/i) || line.match(/\bamount[:\s]*\$?(\d+(?:\.\d{2})?)/i)
      if (amtMatch) amount = amtMatch[1]
      const dateMatch = line.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/)
      if (dateMatch && !date) date = dateMatch[0]
      if (line.length > 3 && line.length < 50 && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('tax') && !/^\$?\d+(?:\.\d{2})?$/.test(line.trim())) {
        items.push(line)
      }
    }
    return { amount: amount || '', merchant: merchant || 'Unknown Merchant', date: date || todayAdDateKey(), items: items.slice(0, 5), total: total || amount }
  }

  const determineTransactionDetails = (data: ExtractedData): Omit<TransactionData, 'receiptImage'> => {
    const lowerMerchant = data.merchant.toLowerCase()
    const categoryMappings: Record<string, string> = {
      'restaurant': 'Food & Dining', 'cafe': 'Food & Dining', 'grocery': 'Groceries',
      'supermarket': 'Groceries', 'gas': 'Transportation', 'fuel': 'Transportation',
      'pharmacy': 'Healthcare', 'amazon': 'Shopping', 'netflix': 'Entertainment',
      'electric': 'Bills & Utilities', 'water': 'Bills & Utilities', 'internet': 'Bills & Utilities'
    }
    let detectedCategory = 'Other'
    for (const [keyword, category] of Object.entries(categoryMappings)) {
      if (lowerMerchant.includes(keyword)) { detectedCategory = category; break }
    }
    const description = data.merchant + (data.items.length > 0 ? ` - ${data.items.slice(0, 2).join(', ')}` : '') + (data.items.length > 2 ? '...' : '')
    return { amount: data.amount, description: description.trim(), category: detectedCategory, type: 'expense', date: data.date }
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => { setSelectedImage(e.target?.result as string); setExtractedData(null) }
      reader.readAsDataURL(file)
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error('Camera not supported'); return }
    setIsInitializingCamera(true)
    try {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream }
      setIsCameraActive(true)
    } catch (err: any) {
      toast.error(err.name === 'NotAllowedError' ? 'Camera access denied' : err.name === 'NotFoundError' ? 'No camera found' : 'Camera access failed')
    } finally { setIsInitializingCamera(false) }
  }, [cameraFacingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraActive(false)
  }, [])

  const switchCamera = useCallback(() => {
    setCameraFacingMode(p => p === 'environment' ? 'user' : 'environment')
    setTimeout(() => startCamera(), 100)
  }, [startCamera])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) { toast.error('Camera not ready'); return }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setSelectedImage(canvas.toDataURL('image/jpeg', 0.9))
    setExtractedData(null)
    stopCamera()
  }, [stopCamera])

  const processImage = useCallback(async () => {
    if (!selectedImage) return
    setIsProcessing(true)
    try {
      const text = await extractTextFromImage(selectedImage)
      setExtractedData(parseReceiptText(text))
      toast.success('Receipt processed!')
    } catch { toast.error('Failed to process receipt') }
    finally { setIsProcessing(false) }
  }, [selectedImage])

  const confirmTransaction = useCallback(() => {
    if (!extractedData) return
    const t = determineTransactionDetails(extractedData)
    addTransaction({ amount: parseFloat(t.amount) || 0, description: t.description, category: t.category, type: t.type, date: t.date || new Date().toISOString() })
    toast.success('Transaction added from scan')
    resetScanner()
  }, [extractedData])

  const resetScanner = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setSelectedImage(null); setExtractedData(null); setIsCameraActive(false); setIsInitializingCamera(false)
  }, [])

  const handleScanAgain = useCallback(() => setExtractedData(null), [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scanner</h2>
          <p className="text-sm text-muted-foreground">Scan receipts and QR codes</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <ReceiptScannerModal
          isOpen={true}
          onOpenChange={() => {}}
          inline
          selectedImage={selectedImage}
          isProcessing={isProcessing}
          extractedData={extractedData}
          isCameraActive={isCameraActive}
          isInitializingCamera={isInitializingCamera}
          cameraFacingMode={cameraFacingMode}
          onFileUpload={handleFileUpload}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onSwitchCamera={switchCamera}
          onCaptureImage={captureImage}
          onProcessImage={processImage}
          onConfirmTransaction={confirmTransaction}
          onResetScanner={resetScanner}
          onScanAgain={handleScanAgain}
          fileInputRef={fileInputRef}
          videoRef={videoRef}
          canvasRef={canvasRef}
          determineTransactionDetails={determineTransactionDetails}
        />
      </div>
    </div>
  )
}
