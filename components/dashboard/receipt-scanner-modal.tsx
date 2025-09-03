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

  // Check video element readiness
  useEffect(() => {
    const checkVideoElement = () => {
      if (videoRef.current) {
        console.log('Video element is ready for use')
        setVideoElementReady(true)
      } else {
        console.log('Video element not yet available')
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
    if (isCameraActive || (isScanningQR && onStopQRScan)) {
      if (activeTab === "receipt") {
        console.log('Stopping receipt camera')
        onStopCamera()
      } else if (activeTab === "qr" && onStopQRScan) {
        console.log('Stopping QR camera')
        onStopQRScan()
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

      console.log('Video element completely reset')

      // Small delay to ensure reset completes
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    setActiveTab(newTab)
    setVideoElementReady(true)
  }, [activeTab, isCameraActive, isScanningQR, onStopCamera, onStopQRScan, videoRef])

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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Multi-Scanner
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Receipt
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receipt" className="space-y-6">
          {/* Image Selection */}
          {!selectedImage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Receipt Scanner
                </CardTitle>
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
                    onClick={onStartCamera}
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    disabled={isInitializingCamera}
                  >
                    {isInitializingCamera ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                    {isInitializingCamera ? 'Starting...' : 'Take Photo'}
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={onSwitchCamera}
                      variant="outline"
                      size="sm"
                      disabled={isInitializingCamera}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Switch Camera
                    </Button>
                    <Button
                      onClick={onToggleFlashlight}
                      variant="outline"
                      size="sm"
                      disabled={isInitializingCamera}
                    >
                      {isFlashlightOn ? (
                        <FlashlightOff className="w-4 h-4 mr-1" />
                      ) : (
                        <Flashlight className="w-4 h-4 mr-1" />
                      )}
                      {isFlashlightOn ? 'Flash Off' : 'Flash On'}
                    </Button>
                    <Button
                      onClick={onStartCamera}
                      variant="outline"
                      size="sm"
                      disabled={isInitializingCamera}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Refresh
                    </Button>
                    <Button
                      onClick={onStopCamera}
                      variant="outline"
                      size="sm"
                      disabled={isInitializingCamera}
                    >
                      <Square className="w-4 h-4 mr-1" />
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
                    className="w-full h-80 object-cover rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
                    style={{
                      transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none',
                      backgroundColor: '#000'
                    }}
                    onLoadedMetadata={(e) => {
                      console.log('Video loaded metadata:', e.target)
                      const video = e.target as HTMLVideoElement
                      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight)
                      console.log('Video readyState:', video.readyState)
                    }}
                    onCanPlay={(e) => {
                      console.log('Video can play')
                      const video = e.target as HTMLVideoElement
                      console.log('Video dimensions on canPlay:', video.videoWidth, 'x', video.videoHeight)
                    }}
                    onError={(e) => {
                      console.error('Video element error:', e)
                      const video = e.target as HTMLVideoElement
                      console.error('Video error details:', {
                        error: video.error,
                        networkState: video.networkState,
                        readyState: video.readyState
                      })
                      toast.error('Video display error. Please refresh the page and try again.')
                      if (activeTab === "qr" && onStopQRScan) {
                        onStopQRScan()
                      } else {
                        onStopCamera()
                      }
                    }}
                    onAbort={(e) => {
                      console.log('Video aborted')
                      toast.error('Camera access was interrupted. Please try again.')
                    }}
                    onEmptied={(e) => {
                      console.log('Video emptied - stream lost')
                      toast.error('Camera stream lost. Please restart scanning.')
                    }}
                    onStalled={(e) => {
                      console.log('Video stalled')
                      toast.warning('Camera feed stalled. This may affect scanning.')
                    }}
                    onWaiting={(e) => {
                      console.log('Video waiting for data')
                    }}
                    onPlaying={(e) => {
                      console.log('Video started playing')
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
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full opacity-75"></div>
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
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                            Position receipt in the center
                          </div>
                          <Button
                            onClick={onCaptureImage}
                            size="lg"
                            className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 text-black border-4 border-white shadow-lg"
                          >
                            <Camera className="w-6 h-6" />
                          </Button>
                          <div className="text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                            Tap to capture
                          </div>
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
          {selectedImage && !isCameraActive && (
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

                {!extractedData && (
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
                )}
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
                <div className="grid grid-cols-2 gap-4">
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
                    onClick={onConfirmTransaction}
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

          {/* Instructions */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Tips for best results:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Ensure the receipt is well-lit and in focus</li>
                    <li>Hold the camera steady when capturing</li>
                    <li>Make sure the text is clearly visible</li>
                    <li>Try different angles if text extraction fails</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="qr" className="space-y-6">
            <QRCodeScanner
              isScanning={qrScanning}
              onScanResult={(result) => {
                console.log('QR scan result:', result)
                // Handle QR scan result here
              }}
              onScanningChange={setQrScanning}
              cameraFacingMode={cameraFacingMode}
              isFlashlightOn={qrFlashlightOn}
              onFlashlightToggle={() => setQrFlashlightOn(!qrFlashlightOn)}
              onSwitchCamera={onSwitchCamera}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default ReceiptScannerModal