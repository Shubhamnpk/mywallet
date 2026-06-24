"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Camera, Upload, Scan, X, CheckCircle, AlertCircle, Loader2, RotateCcw, Square, QrCode, History, Copy, ExternalLink, ChevronDown, ChevronUp, Search, Download } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QRCodeScanner from "./qr-code-scanner"
import { useWalletData } from "@/contexts/wallet-data-context"
import { formatAppDateTime, getCalendarSystem } from "@/lib/app-calendar"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage"
import { getCurrencySymbol } from "@/lib/currency"

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
  inline?: boolean
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
  inline,
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
  const { userProfile } = useWalletData()
  const currencySymbol = getCurrencySymbol(userProfile?.currency || "NPR")
  const calendarSystem = getCalendarSystem(userProfile?.calendarSystem)
  const [activeTab, setActiveTab] = useState("receipt")
  const [videoElementReady, setVideoElementReady] = useState(false)
  const [qrScanning, setQrScanning] = useState(false)
  const [qrFlashlightOn, setQrFlashlightOn] = useState(false)
  const [qrCameraFacingMode, setQrCameraFacingMode] = useState<'environment' | 'user'>('environment')
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [localQrHistory, setLocalQrHistory] = useState<any[]>([])
  const [historySearch, setHistorySearch] = useState("")
  const [historyFilter, setHistoryFilter] = useState("all")
  const [showTips, setShowTips] = useState(false)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await loadFromLocalStorage(['receiptScanHistory', 'qrScanHistory'])
        const receiptHistory = Array.isArray(stored.receiptScanHistory) ? stored.receiptScanHistory : []
        const qrScanHistory = Array.isArray(stored.qrScanHistory) ? stored.qrScanHistory : []
        setScanHistory(receiptHistory)
        setLocalQrHistory(qrScanHistory)
      } catch (error) {
        console.error('Failed to load scan history:', error)
      }
    }
    void loadHistory()
  }, [])

  useEffect(() => {
    const checkVideoElement = () => {
      if (videoRef.current) {
        setVideoElementReady(true)
      } else {
        setVideoElementReady(false)
      }
    }
    checkVideoElement()
    const timeout = setTimeout(checkVideoElement, 500)
    return () => clearTimeout(timeout)
  }, [videoRef])

  const handleTabChange = useCallback(async (newTab: string) => {
    if (isCameraActive || qrScanning) {
      if (activeTab === "receipt") {
        onStopCamera()
      } else if (activeTab === "qr") {
        setQrScanning(false)
      }
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    if (videoRef.current) {
      const video = videoRef.current
      video.srcObject = null
      video.load()
      video.currentTime = 0
      video.onloadedmetadata = null
      video.oncanplay = null
      video.onerror = null
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    setActiveTab(newTab)
    setVideoElementReady(true)
  }, [activeTab, isCameraActive, qrScanning, onStopCamera, videoRef])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }, [])

  const handleQRAction = useCallback((beautified: any) => {
    if (!beautified) return
    switch (beautified.type) {
      case 'url':
        window.open(beautified.url, '_blank', 'noopener')
        break
      case 'email':
        window.location.href = `mailto:${beautified.email}`
        break
      case 'phone':
        window.location.href = `tel:${beautified.phone || beautified.number || beautified.tel}`
        break
      case 'wifi':
        copyToClipboard(`WiFi Network: ${beautified.ssid}\nPassword: ${beautified.password || 'No password'}`)
        break
      case 'calendar':
        copyToClipboard(beautified.icsData || beautified.displayText)
        break
      default:
        copyToClipboard(beautified.content || beautified.displayText)
    }
  }, [copyToClipboard])

  const saveReceiptToHistory = useCallback((data: ExtractedData) => {
    const historyItem = { id: Date.now().toString(), type: 'receipt', data, timestamp: Date.now() }
    const updatedHistory = [historyItem, ...scanHistory].slice(0, 10)
    setScanHistory(updatedHistory)
    void saveToLocalStorage('receiptScanHistory', updatedHistory, true)
  }, [scanHistory])

  const saveQrToHistory = useCallback((result: QRScanResult) => {
    const historyItem = { id: Date.now().toString(), type: 'qr', data: result, timestamp: Date.now() }
    const updatedHistory = [historyItem, ...localQrHistory].slice(0, 10)
    setLocalQrHistory(updatedHistory)
    void saveToLocalStorage('qrScanHistory', updatedHistory, true)
  }, [localQrHistory])

  const clearAllHistory = useCallback(() => {
    setScanHistory([])
    setLocalQrHistory([])
    localStorage.removeItem('receiptScanHistory')
    localStorage.removeItem('qrScanHistory')
    toast.success('Scan history cleared')
  }, [])

  const exportHistory = useCallback((format: 'json' | 'csv') => {
    const allHistory = [
      ...scanHistory.map(item => ({ ...item, scanType: 'receipt' })),
      ...localQrHistory.map(item => ({ ...item, scanType: 'qr' }))
    ].sort((a, b) => b.timestamp - a.timestamp)

    if (format === 'json') {
      const dataStr = JSON.stringify(allHistory, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', `scan-history-${new Date().toISOString().split('T')[0]}.json`)
      linkElement.click()
    } else {
      const headers = ['Type', 'Scan Type', 'Data', 'Timestamp']
      const csvContent = [
        headers.join(','),
        ...allHistory.map(item => [
          item.type,
          item.scanType,
          `"${(item.scanType === 'receipt'
            ? `${item.data.merchant || 'Unknown'} - ${item.data.amount || '0'}`
            : (item.data.beautified?.displayText || item.data.data || '')
          ).replace(/"/g, '""')}"`,
          new Date(item.timestamp).toISOString()
        ].join(','))
      ].join('\n')
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', `scan-history-${new Date().toISOString().split('T')[0]}.csv`)
      linkElement.click()
    }
    toast.success(`History exported as ${format.toUpperCase()}`)
  }, [scanHistory, localQrHistory])

  const filteredHistory = useCallback(() => {
    const allHistory = [
      ...scanHistory.map(item => ({ ...item, scanType: 'receipt' })),
      ...localQrHistory.map(item => ({ ...item, scanType: 'qr' }))
    ].sort((a, b) => b.timestamp - a.timestamp)

    return allHistory.filter(item => {
      const matchesSearch = historySearch === '' ||
        (item.data.beautified?.displayText || item.data.data || item.data.amount || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        item.type.toLowerCase().includes(historySearch.toLowerCase())
      const matchesFilter = historyFilter === 'all' ||
        (historyFilter === 'receipt' && item.scanType === 'receipt') ||
        (historyFilter === 'qr' && item.scanType === 'qr')
      return matchesSearch && matchesFilter
    })
  }, [scanHistory, localQrHistory, historySearch, historyFilter])

  const tabsPanel = (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
          <div className="px-4 sm:px-6 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-3 h-10 bg-muted/50">
              <TabsTrigger value="receipt" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background">
                <Scan className="w-3.5 h-3.5" />
                Receipt
              </TabsTrigger>
              <TabsTrigger value="qr" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background">
                <QrCode className="w-3.5 h-3.5" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background">
                <History className="w-3.5 h-3.5" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-4">
            <TabsContent value="receipt" className="mt-0 space-y-4">
              {/* Initial choice */}
              {!selectedImage && !isCameraActive && !isInitializingCamera && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 p-6 sm:p-8 hover:border-primary/50 hover:bg-accent/30 transition-all active:scale-[0.99]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30">
                      <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm">Upload File</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Select a receipt image</div>
                    </div>
                  </button>

                  <button
                    onClick={onStartCamera}
                    disabled={isInitializingCamera}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 p-6 sm:p-8 hover:border-primary/50 hover:bg-accent/30 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
                      {isInitializingCamera ? (
                        <Loader2 className="w-6 h-6 animate-spin text-green-600 dark:text-green-400" />
                      ) : (
                        <Camera className="w-6 h-6 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm">{isInitializingCamera ? 'Starting...' : 'Take Photo'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Use your device camera</div>
                    </div>
                  </button>

                  <Input ref={fileInputRef} type="file" accept="image/*" onChange={onFileUpload} className="hidden" />
                </div>
              )}

              {/* Camera view */}
              {(isCameraActive || isInitializingCamera) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Camera className="w-4 h-4" />
                      {cameraFacingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
                    </div>
                    <div className="flex gap-1.5">
                      <Button onClick={onSwitchCamera} variant="ghost" size="sm" disabled={isInitializingCamera} className="h-8 px-2 text-xs">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Switch
                      </Button>
                      <Button onClick={() => onToggleFlashlight?.()} variant="ghost" size="sm" disabled={isInitializingCamera} className="h-8 px-2 text-xs">
                        {isFlashlightOn ? <X className="w-3.5 h-3.5 mr-1" /> : <Camera className="w-3.5 h-3.5 mr-1" />}
                        {isFlashlightOn ? 'Off' : 'Flash'}
                      </Button>
                      <Button onClick={onStopCamera} variant="ghost" size="sm" disabled={isInitializingCamera} className="h-8 px-2 text-xs text-destructive">
                        <Square className="w-3.5 h-3.5 mr-1" /> Stop
                      </Button>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full aspect-[4/3] object-cover"
                      style={{ transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                      onError={() => {
                        toast.error('Camera error. Please try again.')
                        onStopCamera()
                      }}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {isInitializingCamera && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="text-center text-white">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <div className="text-sm font-medium">Starting camera...</div>
                          <div className="text-xs text-white/70 mt-1">Please allow camera access</div>
                        </div>
                      </div>
                    )}

                    {isCameraActive && !isInitializingCamera && (
                      <>
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-36 sm:w-56 sm:h-44 border-2 border-white/40 rounded-xl" />
                        </div>
                        <div className="absolute top-3 left-3">
                          <span className="flex items-center gap-1.5 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            Live
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                          <button
                            onClick={onCaptureImage}
                            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white hover:bg-white/90 shadow-xl transition-transform active:scale-95 border-4 border-white/60"
                          >
                            <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-black" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setShowTips(!showTips)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showTips ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Camera tips
                  </button>

                  {showTips && (
                    <div className="rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground space-y-1">
                      <p>• Ensure good lighting for better text recognition</p>
                      <p>• Hold camera steady and keep receipt flat</p>
                      <p>• Center the receipt in the viewfinder</p>
                      <p>• Make sure all text is clearly visible</p>
                    </div>
                  )}
                </div>
              )}

              {/* Selected image preview */}
              {selectedImage && !isCameraActive && !extractedData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Upload className="w-4 h-4" />
                      Receipt Preview
                    </div>
                    <Button onClick={onResetScanner} variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-xl border">
                    <img src={selectedImage} alt="Receipt" className="w-full max-h-72 object-contain bg-muted/30" />
                  </div>
                  <Button onClick={onProcessImage} disabled={isProcessing} className="w-full h-11">
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><Scan className="w-4 h-4 mr-2" /> Scan Receipt</>
                    )}
                  </Button>
                </div>
              )}

              {/* Extracted data */}
              {extractedData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="font-semibold text-sm">Extracted Information</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/40 px-4 py-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Amount</div>
                      <div className="text-xl font-bold font-mono mt-0.5">{currencySymbol} {extractedData.amount || '—'}</div>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-4 py-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Merchant</div>
                      <div className="text-base font-semibold mt-0.5 truncate">{extractedData.merchant}</div>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-4 py-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</div>
                      <div className="text-sm font-medium mt-0.5">{extractedData.date}</div>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-4 py-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Category</div>
                      <Badge variant="secondary" className="mt-1 text-xs">{determineTransactionDetails(extractedData).category}</Badge>
                    </div>
                  </div>

                  {extractedData.items.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">Detected Items</div>
                      <div className="rounded-xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground space-y-0.5">
                        {extractedData.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Transaction Summary</div>
                    <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">{currencySymbol} {determineTransactionDetails(extractedData).amount}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-medium">{determineTransactionDetails(extractedData).category}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Description</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{determineTransactionDetails(extractedData).description}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      onClick={() => { saveReceiptToHistory(extractedData); onConfirmTransaction() }}
                      className="flex-1 h-11"
                      disabled={!extractedData.amount}
                    >
                      Use This Data
                    </Button>
                    <Button onClick={onScanAgain} variant="outline" className="h-11 px-6">
                      Scan Again
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="qr" className="mt-0">
              <QRCodeScanner
                isScanning={qrScanning}
                onScanResult={(result: QRScanResult) => {
                  if (onClearQRResult) onClearQRResult()
                  saveQrToHistory(result)
                }}
                onScanningChange={setQrScanning}
                cameraFacingMode={qrCameraFacingMode}
                isFlashlightOn={qrFlashlightOn}
                onFlashlightToggle={setQrFlashlightOn}
                onSwitchCamera={() => setQrCameraFacingMode(qrCameraFacingMode === 'environment' ? 'user' : 'environment')}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Scan History</span>
                </div>
                <div className="flex gap-1.5">
                  <Button onClick={() => exportHistory('json')} variant="outline" size="sm" disabled={scanHistory.length === 0 && localQrHistory.length === 0} className="h-8 text-xs px-2.5">
                    <Download className="w-3 h-3 mr-1" /> JSON
                  </Button>
                  <Button onClick={() => exportHistory('csv')} variant="outline" size="sm" disabled={scanHistory.length === 0 && localQrHistory.length === 0} className="h-8 text-xs px-2.5">
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                  <Button onClick={clearAllHistory} variant="outline" size="sm" disabled={scanHistory.length === 0 && localQrHistory.length === 0} className="h-8 text-xs px-2.5 text-destructive">
                    Clear
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search scans..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="pl-8 h-9 text-sm" />
                </div>
                <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs" title="Filter">
                  <option value="all">All</option>
                  <option value="receipt">Receipts</option>
                  <option value="qr">QR</option>
                </select>
              </div>

              {filteredHistory().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                    <History className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">No scan history yet</p>
                  <p className="text-xs mt-0.5">Your recent scans will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory().map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-xl border p-3.5 hover:bg-accent/30 transition-colors">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        item.scanType === 'receipt'
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                          : 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400'
                      }`}>
                        {item.scanType === 'receipt' ? <Scan className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            item.scanType === 'receipt'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          }`}>
                            {item.scanType === 'receipt' ? 'Receipt' : 'QR Code'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatAppDateTime(new Date(item.timestamp), calendarSystem)}
                          </span>
                        </div>
                        {item.scanType === 'receipt' ? (
                          <>
                            <div className="text-sm font-medium">{currencySymbol} {item.data.amount || '—'}</div>
                            <div className="text-xs text-muted-foreground truncate">{item.data.merchant || 'Unknown merchant'}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-medium truncate">{item.data.beautified?.title || 'QR Code'}</div>
                            <div className="text-xs text-muted-foreground truncate">{item.data.beautified?.displayText || item.data.data}</div>
                          </>
                        )}
                      </div>
                      {item.scanType === 'qr' && (
                        <Button onClick={() => handleQRAction(item.data.beautified)} variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
  )

  const dialogContent = (
    <DialogContent className="sm:max-w-3xl sm:max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
      <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b shrink-0">
        <DialogTitle className="flex items-center gap-2 text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scan className="w-4 h-4" />
          </div>
          Scanner
        </DialogTitle>
      </DialogHeader>
      {tabsPanel}
    </DialogContent>
  )

  if (inline) {
    return <div className="flex flex-col h-full">{tabsPanel}</div>
  }
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {dialogContent}
    </Dialog>
  )
}

export default ReceiptScannerModal
