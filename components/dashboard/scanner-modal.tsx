"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Camera, Upload, Scan, X, CheckCircle, AlertCircle, Loader2, RotateCcw, Square, QrCode, History, Copy, ExternalLink, Phone, Mail, Wifi, Flashlight, FlashlightOff } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QRCodeScanner from "./qr-code-scanner"

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

interface QRCodeData {
  id: string
  rawData: string
  parsedData: any
  timestamp: number
  type: 'url' | 'text' | 'contact' | 'email' | 'phone' | 'wifi' | 'unknown'
  beautifiedData?: any
}

interface QRScanResult {
  data: string
  timestamp: number
  type: string
  beautified?: any
}

interface ReceiptScannerModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedImage: string | null
  isProcessing: boolean
  extractedData: ExtractedData | null
  isCameraActive: boolean
  isInitializingCamera: boolean
  cameraFacingMode: 'environment' | 'user'
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onStartCamera: () => void
  onStopCamera: () => void
  onSwitchCamera: () => void
  onCaptureImage: () => void
  onProcessImage: () => void
  onConfirmTransaction: () => void
  onResetScanner: () => void
  onScanAgain: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  qrVideoRef?: React.RefObject<HTMLVideoElement>
  determineTransactionDetails: (data: ExtractedData) => Omit<TransactionData, 'receiptImage'>
  // QR Code props (optional)
  qrScanResult?: QRScanResult | null
  qrHistory?: QRCodeData[]
  isScanningQR?: boolean
  isFlashlightOn?: boolean
  onQRFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onStartQRScan?: () => void
  onStopQRScan?: () => void
  onToggleFlashlight?: () => void
  onClearQRResult?: () => void
  onDeleteQRHistory?: (id: string) => void
  qrFileInputRef?: React.RefObject<HTMLInputElement>
}

const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onOpenChange,
  selectedImage,
  isProcessing,
  extractedData,
  isCameraActive,
  isInitializingCamera,
  cameraFacingMode,
  onFileUpload,
  onStartCamera,
  onStopCamera,
  onSwitchCamera,
  onCaptureImage,
  onProcessImage,
  onConfirmTransaction,
  onResetScanner,
  onScanAgain,
  fileInputRef,
  videoRef,
  canvasRef,
  determineTransactionDetails,
  // QR Code props
  qrScanResult,
  qrHistory,
  isScanningQR,
  isFlashlightOn,
  onQRFileUpload,
  onStartQRScan,
  onStopQRScan,
  onToggleFlashlight,
  onClearQRResult,
  onDeleteQRHistory,
  qrFileInputRef,
  qrVideoRef
}) => {
  const [activeTab, setActiveTab] = useState("receipt")
  const [videoElementReady, setVideoElementReady] = useState(false)
  const [qrScanning, setQrScanning] = useState(false)
  const [qrFlashlightOn, setQrFlashlightOn] = useState(false)
  const [qrCameraFacingMode, setQrCameraFacingMode] = useState<'environment' | 'user'>('environment')
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [localQrHistory, setLocalQrHistory] = useState<any[]>([])

  // Load scan history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const receiptHistory = JSON.parse(localStorage.getItem('receiptScanHistory') || '[]')
        const qrScanHistory = JSON.parse(localStorage.getItem('qrScanHistory') || '[]')
        setScanHistory(receiptHistory)
        setLocalQrHistory(qrScanHistory)
      } catch (error) {
        console.error('Failed to load scan history:', error)
      }
    }
    loadHistory()
  }, [])

  // Check video element readiness
  useEffect(() => {
    const checkVideoElement = () => {
      if (videoRef.current) {
        setVideoElementReady(true)
      } else {
        setVideoElementReady(false)
      }
    }

    // Check immediately
    checkVideoElement()

    // Also check after a short delay in case component is still mounting
    const timeout = setTimeout(checkVideoElement, 500)

    return () => clearTimeout(timeout)
  }, [videoRef])

  // Reset camera when switching tabs
  const handleTabChange = useCallback(async (newTab: string) => {
    console.log(`Switching from ${activeTab} to ${newTab} tab`)

    // Stop any active camera before switching tabs
    if (isCameraActive || qrScanning) {
      if (activeTab === "receipt") {
        onStopCamera()
      } else if (activeTab === "qr") {
        setQrScanning(false)
      }

      // Wait for camera to fully stop before proceeding
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    // Reset video element when switching tabs
    if (videoRef.current) {
      console.log(`Resetting video element for ${newTab} scanning`)

      // Force complete reset of video element
      const video = videoRef.current
      video.srcObject = null
      video.load()
      video.currentTime = 0

      // Clear any existing event listeners
      video.onloadedmetadata = null
      video.oncanplay = null
      video.onerror = null
      video.onabort = null
      video.onemptied = null
      video.onstalled = null
      // Small delay to ensure reset completes
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    setActiveTab(newTab)
    setVideoElementReady(true)
  }, [activeTab, isCameraActive, qrScanning, onStopCamera, videoRef])

  // Copy QR code data to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy to clipboard")
    }
  }, [])

  // Handle QR code actions
  const handleQRAction = useCallback((beautified: any) => {
    switch (beautified.type) {
      case 'url':
        window.open(beautified.url, '_blank')
        break
      case 'email':
        window.location.href = `mailto:${beautified.email}`
        break
      case 'phone':
        window.location.href = `tel:${beautified.phone}`
        break
      case 'wifi':
        copyToClipboard(`WiFi Network: ${beautified.ssid}\nPassword: ${beautified.password || 'No password'}`)
        break
      default:
        copyToClipboard(beautified.content || beautified.displayText)
    }
  }, [copyToClipboard])

  // Save receipt scan to history
  const saveReceiptToHistory = useCallback((data: ExtractedData) => {
    const historyItem = {
      id: Date.now().toString(),
      type: 'receipt',
      data,
      timestamp: Date.now()
    }
    const updatedHistory = [historyItem, ...scanHistory].slice(0, 10) // Keep last 10
    setScanHistory(updatedHistory)
    localStorage.setItem('receiptScanHistory', JSON.stringify(updatedHistory))
  }, [scanHistory])

  // Save QR scan to history
  const saveQrToHistory = useCallback((result: QRScanResult) => {
    const historyItem = {
      id: Date.now().toString(),
      type: 'qr',
      data: result,
      timestamp: Date.now()
    }
    const updatedHistory = [historyItem, ...localQrHistory].slice(0, 10) // Keep last 10
    setLocalQrHistory(updatedHistory)
    localStorage.setItem('qrScanHistory', JSON.stringify(updatedHistory))
  }, [localQrHistory])

  // Clear all history
  const clearAllHistory = useCallback(() => {
    setScanHistory([])
    setLocalQrHistory([])
    localStorage.removeItem('receiptScanHistory')
    localStorage.removeItem('qrScanHistory')
    toast.success('Scan history cleared')
  }, [])
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none max-h-none overflow-y-auto p-4 sm:p-6 sm:max-w-2xl sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Multi-Scanner
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10">
            <TabsTrigger value="receipt" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Scan className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Receipt</span>
              <span className="xs:hidden">Scan</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">QR Code</span>
              <span className="xs:hidden">QR</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <History className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">History</span>
              <span className="xs:hidden">Hist</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receipt" className="space-y-6">
          {/* Image Selection */}
          {!selectedImage && !isCameraActive && !isInitializingCamera && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Receipt Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="h-20 sm:h-24 flex flex-col gap-1 sm:gap-2 p-3 sm:p-4"
                  >
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-xs sm:text-sm">Upload</span>
                  </Button>

                  <Button
                    onClick={onStartCamera}
                    variant="outline"
                    className="h-20 sm:h-24 flex flex-col gap-1 sm:gap-2 p-3 sm:p-4"
                    disabled={isInitializingCamera}
                  >
                    {isInitializingCamera ? (
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                    <span className="text-xs sm:text-sm">
                      {isInitializingCamera ? 'Starting...' : 'Take Photo'}
                    </span>
                  </Button>
                </div>

                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>
          )}

          {/* Camera View */}
          {(isCameraActive || isInitializingCamera) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Camera {cameraFacingMode === 'environment' ? 'Back' : 'Front'}
                  </CardTitle>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Button
                      onClick={onSwitchCamera}
                      variant="outline"
                      size="sm"
                      disabled={isInitializingCamera}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Switch Camera</span>
                      <span className="sm:hidden">Switch</span>
                    </Button>
                    <Button
                      onClick={onToggleFlashlight}
                      variant="outline"
                      size="sm"
                      disabled={isInitializingCamera}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      {isFlashlightOn ? (
                        <FlashlightOff className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      ) : (
                        <Flashlight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      )}
                      <span className="hidden sm:inline">{isFlashlightOn ? 'Flash Off' : 'Flash On'}</span>
                      <span className="sm:hidden">{isFlashlightOn ? 'Off' : 'On'}</span>
                    </Button>
                    <Button
                      onClick={onStopCamera}
                      variant="outline"
                      size="sm"
                      disabled={isInitializingCamera}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Stop
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    className="w-full h-64 sm:h-80 object-cover rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
                    style={{
                      transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none',
                      backgroundColor: '#000'
                    }}
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement
                    }}
                    onCanPlay={(e) => {
                      const video = e.target as HTMLVideoElement
                    }}
                    onError={(e) => {
                      const video = e.target as HTMLVideoElement
                      toast.error('Video display error. Please refresh the page and try again.')
                      if (activeTab === "qr" && onStopQRScan) {
                        onStopQRScan()
                      } else {
                        onStopCamera()
                      }
                    }}
                    onAbort={(e) => {
                      toast.error('Camera access was interrupted. Please try again.')
                    }}
                    onEmptied={(e) => {
                      toast.error('Camera stream lost. Please restart scanning.')
                    }}
                    onStalled={(e) => {
                      toast.warning('Camera feed stalled. This may affect scanning.')
                    }}
                    onWaiting={(e) => {
                    }}
                    onPlaying={(e) => {
                    }}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Loading overlay */}
                  {isInitializingCamera && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <div className="text-sm">Starting camera...</div>
                        <div className="text-xs mt-2 opacity-75">Please allow camera access when prompted</div>
                      </div>
                    </div>
                  )}

                  {/* Error overlay */}
                  {!isInitializingCamera && !isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                      <div className="text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                        <div className="text-sm mb-3">Camera not active</div>
                        <Button
                          onClick={activeTab === "qr" ? onStartQRScan : onStartCamera}
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-black"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Start Camera
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Camera overlay with focus guide - only show when active */}
                  {isCameraActive && !isInitializingCamera && (
                    <>
                      <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-full border-2 border-white/50 rounded-lg">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-white rounded-lg opacity-75"></div>
                    </div>
                  </div>

                      {/* Camera status indicator */}
                      <div className="absolute top-4 left-4">
                        <div className="flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          Recording
                        </div>
                      </div>

                      {/* Camera controls */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                        <div className="flex flex-col items-center gap-3">
                          <Button
                            onClick={onCaptureImage}
                            size="lg"
                            className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 text-black border-4 border-white shadow-lg"
                          >
                            <Camera className="w-6 h-6" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Camera tips */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Camera Tips:</strong>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• Ensure good lighting for better text recognition</li>
                        <li>• Hold camera steady and keep receipt flat</li>
                        <li>• Center the receipt in the viewfinder</li>
                        <li>• Make sure all text is clearly visible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Camera Starting State */}
          {isInitializingCamera && (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <div className="text-lg font-medium">Starting Camera...</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Please allow camera access when prompted
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Image Preview */}
          {selectedImage && !isCameraActive && !extractedData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Receipt Preview</CardTitle>
                  <Button
                    onClick={onResetScanner}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Receipt"
                    className="w-full max-h-64 object-contain rounded-lg border"
                  />
                </div>

                <Button
                  onClick={onProcessImage}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Receipt...
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      Scan Receipt
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Extracted Data Display */}
          {extractedData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Extracted Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm font-medium">Amount</Label>
                    <div className="text-lg font-semibold">
                      ${extractedData.amount || 'Not detected'}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Merchant</Label>
                    <div className="text-lg font-semibold">
                      {extractedData.merchant}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Date</Label>
                    <div className="text-sm text-muted-foreground">
                      {extractedData.date}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <Badge variant="secondary">
                      {determineTransactionDetails(extractedData).category}
                    </Badge>
                  </div>
                </div>

                {extractedData.items.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Items Detected</Label>
                    <div className="mt-2 space-y-1">
                      {extractedData.items.map((item, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          • {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Transaction Summary</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <div className="text-sm">
                      <strong>Expense:</strong> ${determineTransactionDetails(extractedData).amount}
                    </div>
                    <div className="text-sm">
                      <strong>Category:</strong> {determineTransactionDetails(extractedData).category}
                    </div>
                    <div className="text-sm">
                      <strong>Description:</strong> {determineTransactionDetails(extractedData).description}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      saveReceiptToHistory(extractedData)
                      onConfirmTransaction()
                    }}
                    className="flex-1"
                    disabled={!extractedData.amount}
                  >
                    Use This Data
                  </Button>
                  <Button
                    onClick={onScanAgain}
                    variant="outline"
                  >
                    Scan Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          </TabsContent>

          <TabsContent value="qr" className="space-y-6">
            <QRCodeScanner
              isScanning={qrScanning}
              onScanResult={(result: QRScanResult) => {
                // Update the QR scan result in parent component
                if (onClearQRResult) {
                  // Clear any previous result first
                  onClearQRResult()
                }
                // Save to history
                saveQrToHistory(result)
                // The QRCodeScanner handles its own state, but we can pass this up if needed
                console.log('QR Code scanned:', result)
              }}
              onScanningChange={setQrScanning}
              cameraFacingMode={qrCameraFacingMode}
              isFlashlightOn={qrFlashlightOn}
              onFlashlightToggle={() => setQrFlashlightOn(!qrFlashlightOn)}
              onSwitchCamera={() => setQrCameraFacingMode(qrCameraFacingMode === 'environment' ? 'user' : 'environment')}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Scan History
                  </CardTitle>
                  <Button
                    onClick={clearAllHistory}
                    variant="outline"
                    size="sm"
                    disabled={scanHistory.length === 0 && localQrHistory.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {scanHistory.length === 0 && localQrHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No scan history yet</p>
                    <p className="text-sm">Your recent scans will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Receipt Scans */}
                    {scanHistory.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Scan className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">Receipt</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  ${item.data.amount || 'Amount not detected'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {item.data.merchant || 'Merchant not detected'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {/* QR Scans */}
                    {localQrHistory.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <QrCode className="w-5 h-5 text-green-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">QR Code</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {item.data.beautified?.title || 'QR Code'}
                                </p>
                                <p className="text-sm text-muted-foreground break-all">
                                  {item.data.beautified?.displayText || item.data.data}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleQRAction(item.data.beautified)}
                            variant="ghost"
                            size="sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default ReceiptScannerModal