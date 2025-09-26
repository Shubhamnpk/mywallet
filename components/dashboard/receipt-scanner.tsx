"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { getDefaultCategories } from "@/lib/categories"
import ReceiptScannerModal from "./scanner-modal"

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
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment')
  const [isInitializingCamera, setIsInitializingCamera] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)


  // Cleanup camera on unmount or dialog close
  useEffect(() => {
    return () => {
      // Stop all streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      // Clean up video elements
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [])

  // Log when video element is mounted
  useEffect(() => {
    if (videoRef.current) {
      // Small delay to ensure element is fully rendered
      setTimeout(() => {
        setIsVideoReady(true)
      }, 100)
    } else {
      setIsVideoReady(false)
    }
  }, [])

  // Force video element to be ready when camera view is shown
  useEffect(() => {
    if ((isCameraActive || isInitializingCamera) && !isVideoReady) {
      if (videoRef.current) {
        setIsVideoReady(true)
      }
    }
  }, [isCameraActive, isInitializingCamera, isVideoReady])

  // Initialize Tesseract.js for OCR
  const loadTesseract = async () => {
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng')
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,/- '
      })
      return worker
    } catch (error) {
      console.error('Failed to load Tesseract:', error)
      throw new Error('OCR functionality not available')
    }
  }

  // Extract text from image using OCR
  const extractTextFromImage = async (imageData: string): Promise<string> => {
    const worker = await loadTesseract()

    try {
      toast.info('Processing receipt with OCR...')

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

  // Check if camera is supported
  const isCameraSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }, [])

  // Handle camera capture
  const startCamera = useCallback(async () => {
    if (!isCameraSupported()) {
      toast.error('Camera is not supported in this browser')
      return
    }

    setIsInitializingCamera(true)
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      const constraints = {
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      streamRef.current = stream

      // Wait for video element to be available with retry
      let attempts = 0
      const maxAttempts = 10

      while (!videoRef.current && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!videoRef.current) {
        throw new Error('Video element not available')
      }

      // Remove any existing event listeners
      videoRef.current.onloadedmetadata = null
      videoRef.current.oncanplay = null
      videoRef.current.onerror = null

      // Set the stream
      videoRef.current.srcObject = stream

      // Wait for video to be ready with timeout
      const videoReady = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'))
        }, 10000) // 10 second timeout

        const cleanup = () => {
          clearTimeout(timeout)
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = null
            videoRef.current.oncanplay = null
            videoRef.current.onerror = null
          }
        }

        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            cleanup()
            resolve()
          }
          videoRef.current.oncanplay = () => {
            cleanup()
            resolve()
          }
          videoRef.current.onerror = (e) => {
            cleanup()
            reject(new Error('Video failed to load'))
          }
        } else {
          cleanup()
          reject(new Error('Video element lost'))
        }
      })

      await videoReady
      setIsCameraActive(true)
      toast.success('Camera started successfully')
    } catch (error) {

      // Provide specific error messages
      let errorMessage = 'Camera access failed'
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.'
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.'
        } else if (error.message.includes('Video element')) {
          errorMessage = 'Video display error. Please refresh the page and try again.'
        } else {
          errorMessage = `Camera error: ${error.message}`
        }
      }

      toast.error(errorMessage)
    } finally {
      setIsInitializingCamera(false)
    }
  }, [cameraFacingMode, isCameraSupported])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
    setIsVideoReady(false)
    toast.info('Camera stopped')
  }, [])

  const switchCamera = useCallback(() => {
    setCameraFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
    // Restart camera with new facing mode
    setTimeout(() => {
      startCamera()
    }, 100)
  }, [startCamera])

  const captureImage = useCallback(() => {
    
    if (!videoRef.current) {
      toast.error('Camera not ready. Please try again.')
      return
    }

    if (!canvasRef.current) {
      toast.error('Capture failed. Please try again.')
      return
    }

    const canvas = canvasRef.current
    const video = videoRef.current

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera feed not ready. Please wait a moment.')
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      toast.error('Capture failed. Please try again.')
      return
    }

    try {

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      const imageData = canvas.toDataURL('image/jpeg', 0.9) // Higher quality for OCR

      setSelectedImage(imageData)
      setExtractedData(null)
      stopCamera()
      toast.success('Photo captured! Ready to scan.')
    } catch (error) {
      toast.error('Failed to capture photo. Please try again.')
    }
  }, [stopCamera])

  // Process the selected image
  const processImage = useCallback(async () => {
    if (!selectedImage) return

    setIsProcessing(true)
    try {
      toast.info('Extracting text from receipt...')

      const extractedText = await extractTextFromImage(selectedImage)
      const parsedData = parseReceiptText(extractedText)

      setExtractedData(parsedData)

      toast.success('Receipt processed successfully!')
    } catch (error) {
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
    resetScanner()
  }, [extractedData, selectedImage, onTransactionData, onOpenChange])

  // Reset extracted data only (for scan again)
  const handleScanAgain = useCallback(() => {
    setExtractedData(null)
  }, [])

  // Reset everything
  const resetScanner = useCallback(() => {
    // Stop all camera streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // Reset all state
    setSelectedImage(null)
    setExtractedData(null)
    setIsCameraActive(false)
    setIsInitializingCamera(false)
    setCameraFacingMode('environment')
    setIsVideoReady(false)
  }, [])

  return (
    <ReceiptScannerModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
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
  )
}

export default ReceiptScanner