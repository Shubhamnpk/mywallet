"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Upload, Scan, X, CheckCircle, AlertCircle, Loader2, RotateCcw, Square, QrCode, History, Copy, ExternalLink, Phone, Mail, Wifi, Flashlight, FlashlightOff } from "lucide-react"

// QR Code interfaces
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

interface QRCodeScannerProps {
  isScanning: boolean
  onScanResult: (result: QRScanResult) => void
  onScanningChange: (scanning: boolean) => void
  cameraFacingMode: 'environment' | 'user'
  isFlashlightOn: boolean
  onFlashlightToggle: () => void
  onSwitchCamera?: () => void
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  isScanning,
  onScanResult,
  onScanningChange,
  cameraFacingMode,
  isFlashlightOn,
  onFlashlightToggle,
  onSwitchCamera
}) => {
  const [qrHistory, setQrHistory] = useState<QRCodeData[]>([])
  const [qrScanResult, setQrScanResult] = useState<QRScanResult | null>(null)
  const [videoElementReady, setVideoElementReady] = useState(false)
  const [isInitializingCamera, setIsInitializingCamera] = useState(false)
  const qrVideoRef = useRef<HTMLVideoElement>(null)
  const qrStreamRef = useRef<MediaStream | null>(null)
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const jsQRRef = useRef<any>(null)

  // Load QR history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('qr-code-history')
    if (saved) {
      try {
        setQrHistory(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load QR history:', error)
      }
    }
  }, [])

  // Load jsQR library
  useEffect(() => {
    const loadJsQR = async () => {
      try {
        const jsQR = (await import('jsqr')).default
        jsQRRef.current = jsQR
        console.log('jsQR library loaded successfully')
      } catch (error) {
        console.error('Failed to load jsQR library:', error)
      }
    }
    loadJsQR()
  }, [])

  // Check video element readiness
  useEffect(() => {
    const checkVideoElement = () => {
      if (qrVideoRef.current) {
        console.log('QR Video element is ready for use')
        setVideoElementReady(true)
      } else {
        console.log('QR Video element not yet available')
        setVideoElementReady(false)
      }
    }

    // Check immediately
    checkVideoElement()

    // Also check after a short delay in case component is still mounting
    const timeout = setTimeout(checkVideoElement, 500)

    return () => clearTimeout(timeout)
  }, [])

  // Save QR history to localStorage
  const saveQRHistory = useCallback((history: QRCodeData[]) => {
    localStorage.setItem('qr-code-history', JSON.stringify(history))
  }, [])

  // Beautify QR code data
  const beautifyQRData = useCallback((data: string): any => {
    // URL detection
    if (data.startsWith('http://') || data.startsWith('https://') || data.startsWith('www.')) {
      return {
        type: 'url',
        title: 'Website Link',
        url: data.startsWith('www.') ? `https://${data}` : data,
        displayText: data.length > 50 ? `${data.substring(0, 47)}...` : data
      }
    }

    // Email detection
    if (data.includes('@') && data.includes('.')) {
      const emailMatch = data.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (emailMatch) {
        return {
          type: 'email',
          title: 'Email Address',
          email: emailMatch[1],
          displayText: emailMatch[1]
        }
      }
    }

    // Phone number detection
    const phoneMatch = data.match(/(\+?[\d\s\-\(\)]{10,})/)
    if (phoneMatch) {
      return {
        type: 'phone',
        title: 'Phone Number',
        phone: phoneMatch[1].replace(/\s+/g, ''),
        displayText: phoneMatch[1]
      }
    }

    // WiFi network detection
    if (data.toUpperCase().includes('WIFI:') || data.includes('WPA') || data.includes('WEP')) {
      const ssidMatch = data.match(/S:([^;]+)/)
      const passwordMatch = data.match(/P:([^;]+)/)
      const typeMatch = data.match(/T:([^;]+)/)

      return {
        type: 'wifi',
        title: 'WiFi Network',
        ssid: ssidMatch ? ssidMatch[1] : 'Unknown',
        password: passwordMatch ? passwordMatch[1] : null,
        security: typeMatch ? typeMatch[1] : 'Unknown',
        displayText: `WiFi: ${ssidMatch ? ssidMatch[1] : 'Unknown Network'}`
      }
    }

    // Contact/VCard detection
    if (data.includes('BEGIN:VCARD') || data.includes('FN:') || data.includes('TEL:')) {
      const nameMatch = data.match(/FN:([^\n]+)/)
      const phoneMatch = data.match(/TEL:([^\n]+)/)
      const emailMatch = data.match(/EMAIL:([^\n]+)/)

      return {
        type: 'contact',
        title: 'Contact Information',
        name: nameMatch ? nameMatch[1] : null,
        phone: phoneMatch ? phoneMatch[1] : null,
        email: emailMatch ? emailMatch[1] : null,
        displayText: nameMatch ? nameMatch[1] : 'Contact Card'
      }
    }

    // Default as text
    return {
      type: 'text',
      title: 'Text Content',
      content: data,
      displayText: data.length > 100 ? `${data.substring(0, 97)}...` : data
    }
  }, [])


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

  // Handle QR file upload
  const handleQRFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result as string
        await processQRCodeFromImage(imageData)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  // Clear QR result
  const handleClearQRResult = useCallback(() => {
    setQrScanResult(null)
  }, [])

  // Delete QR history item
  const handleDeleteQRHistory = useCallback((id: string) => {
    setQrHistory(prev => prev.filter(item => item.id !== id))
    const updatedHistory = qrHistory.filter(item => item.id !== id)
    localStorage.setItem('qr-code-history', JSON.stringify(updatedHistory))
  }, [qrHistory])

  // Check if camera is supported
  const isCameraSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }, [])

  // Check if flashlight/torch is supported
  const isFlashlightSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }, [])

  // Toggle flashlight/torch
  const toggleFlashlight = useCallback(async () => {
    if (!qrStreamRef.current) {
      toast.error('No camera stream available')
      return
    }

    try {
      const videoTrack = qrStreamRef.current.getVideoTracks()[0]
      if (!videoTrack) {
        toast.error('No video track available')
        return
      }

      const capabilities = videoTrack.getCapabilities() as any
      if (!capabilities.torch) {
        toast.error('Flashlight not supported on this device')
        return
      }

      const newTorchState = !isFlashlightOn
      await videoTrack.applyConstraints({
        advanced: [{ torch: newTorchState } as any]
      })

      onFlashlightToggle()
      toast.success(newTorchState ? 'Flashlight turned on' : 'Flashlight turned off')
    } catch (error) {
      console.error('Flashlight error:', error)
      toast.error('Failed to toggle flashlight')
    }
  }, [isFlashlightOn, onFlashlightToggle])

  // Start QR scan (using camera)
  const startQRScan = useCallback(async () => {
    console.log('Starting QR scan...')

    if (!isCameraSupported()) {
      toast.error('Camera is not supported in this browser')
      return
    }

    console.log('Camera is supported, requesting access...')
    onScanningChange(true)
    setIsInitializingCamera(true)

    try {
      // Stop any existing streams first
      if (qrStreamRef.current) {
        qrStreamRef.current.getTracks().forEach(track => track.stop())
        qrStreamRef.current = null
      }

      const constraints = {
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      }

      console.log('Requesting camera access with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      qrStreamRef.current = stream

      console.log('Camera stream obtained:', stream.id)

      // Set the stream to video element
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream
        console.log('Stream assigned to QR video element')
      }

      setIsInitializingCamera(false)
      toast.success('Camera ready for QR scanning')

      // Start continuous scanning with error handling
      const scanFrame = async () => {
        if (!qrVideoRef.current || !isScanning) {
          console.log('Scan frame cancelled - missing elements or scanning stopped')
          return
        }

        try {
          const canvas = document.createElement('canvas')
          const video = qrVideoRef.current
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            console.error('Canvas context not available')
            return
          }

          // Check if video has valid dimensions
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.log('Video dimensions not ready, retrying...')
            if (isScanning) {
              setTimeout(() => requestAnimationFrame(scanFrame), 100)
            }
            return
          }

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

          if (!jsQRRef.current) {
            console.log('jsQR not loaded yet, skipping frame')
            if (isScanning) {
              requestAnimationFrame(scanFrame)
            }
            return
          }

          const code = jsQRRef.current(imageData.data, imageData.width, imageData.height)

          if (code) {
            console.log('QR Code detected:', code.data)
            const beautified = beautifyQRData(code.data)
            const result: QRScanResult = {
              data: code.data,
              timestamp: Date.now(),
              type: beautified.type,
              beautified
            }

            setQrScanResult(result)
            onScanResult(result)

            // Save to history
            const historyItem: QRCodeData = {
              id: Date.now().toString(),
              rawData: code.data,
              parsedData: result,
              timestamp: Date.now(),
              type: beautified.type as any,
              beautifiedData: beautified
            }

            const newHistory = [historyItem, ...qrHistory.slice(0, 49)]
            setQrHistory(newHistory)
            saveQRHistory(newHistory)

            toast.success(`QR Code detected: ${beautified.title}`)
            stopQRScan()
            return
          }
        } catch (error) {
          console.error('QR scan frame error:', error)
        }

        // Continue scanning if no QR found and still scanning
        if (isScanning) {
          requestAnimationFrame(scanFrame)
        }
      }

      // Start scanning after a short delay to ensure video is stable
      setTimeout(() => {
        if (isScanning) {
          console.log('Starting QR scanning loop')
          requestAnimationFrame(scanFrame)
        }
      }, 500)

    } catch (error) {
      console.error('Camera error:', error)
      setIsInitializingCamera(false)

      // Provide specific error messages
      let errorMessage = 'Camera access failed'
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.'
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.'
        } else if (error.name === 'AbortError') {
          errorMessage = 'Camera access was interrupted. Please try again.'
        } else {
          errorMessage = `Camera error: ${error.message}`
        }
      }

      toast.error(errorMessage)
      onScanningChange(false)
    }
  }, [isScanning, onScanResult, onScanningChange, cameraFacingMode, qrHistory, beautifyQRData, saveQRHistory, isCameraSupported])

  // Stop QR scan
  const stopQRScan = useCallback(() => {
    console.log('Stopping QR scan')
    onScanningChange(false)
    setIsInitializingCamera(false)

    // Stop QR stream
    if (qrStreamRef.current) {
      console.log('Stopping QR stream tracks')
      qrStreamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('Track stopped:', track.kind)
      })
      qrStreamRef.current = null
    }

    // Clean up video element
    if (qrVideoRef.current) {
      console.log('Cleaning up QR video element')
      qrVideoRef.current.srcObject = null
      qrVideoRef.current.load()
    }
  }, [onScanningChange])

  // Process QR code from image
  const processQRCodeFromImage = useCallback(async (imageData: string) => {
    try {
      if (!jsQRRef.current) {
        toast.error('QR scanner not ready. Please try again.')
        return
      }

      // Create image element
      const img = new Image()
      img.src = imageData

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      // Create canvas and draw image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Get image data
      const imageDataArray = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Scan for QR code
      const code = jsQRRef.current(imageDataArray.data, imageDataArray.width, imageDataArray.height)

      if (code) {
        const beautified = beautifyQRData(code.data)
        const result: QRScanResult = {
          data: code.data,
          timestamp: Date.now(),
          type: beautified.type,
          beautified
        }

        setQrScanResult(result)
        onScanResult(result)

        // Save to history
        const historyItem: QRCodeData = {
          id: Date.now().toString(),
          rawData: code.data,
          parsedData: result,
          timestamp: Date.now(),
          type: beautified.type as any,
          beautifiedData: beautified
        }

        const newHistory = [historyItem, ...qrHistory.slice(0, 49)]
        setQrHistory(newHistory)
        saveQRHistory(newHistory)

        toast.success(`QR Code scanned: ${beautified.title}`)
      } else {
        toast.error('No QR code found in the image')
      }
    } catch (error) {
      console.error('QR code processing error:', error)
      toast.error('Failed to process QR code')
    }
  }, [qrHistory, beautifyQRData, saveQRHistory, onScanResult])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrStreamRef.current) {
        qrStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = null
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* QR Code Scanner */}
      {!qrScanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => qrFileInputRef?.current?.click()}
                variant="outline"
                className="h-24 flex flex-col gap-2"
              >
                <Upload className="w-6 h-6" />
                Upload QR Image
              </Button>

              <Button
                onClick={startQRScan}
                variant="outline"
                className="h-24 flex flex-col gap-2"
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <QrCode className="w-6 h-6" />
                )}
                {isScanning ? 'Scanning...' : 'Scan QR Code'}
              </Button>
            </div>

            <Input
              ref={qrFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleQRFileUpload}
              className="hidden"
            />

            {/* Debug info */}
            <div className="text-xs text-muted-foreground text-center">
              Camera: {isCameraSupported() ? 'Supported' : 'Not Supported'} |
              Video Ready: {videoElementReady ? 'Yes' : 'No'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera View for QR Scanning */}
      {isScanning && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code Scanner
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
                  onClick={onFlashlightToggle}
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
                  onClick={stopQRScan}
                  variant="outline"
                  size="sm"
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
                ref={qrVideoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className="w-full h-80 object-cover rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
                style={{
                  transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none',
                  backgroundColor: '#000'
                }}
                onLoadedMetadata={() => {
                  console.log('QR Video loaded metadata')
                }}
                onCanPlay={() => {
                  console.log('QR Video can play')
                }}
                onError={(e: any) => {
                  console.error('QR Video element error:', e)
                  toast.error('Video display error. Please refresh the page and try again.')
                  stopQRScan()
                }}
              />

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

              {/* Camera overlay with focus guide */}
              {isScanning && !isInitializingCamera && (
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
                      Scanning for QR codes...
                    </div>
                  </div>

                  {/* Camera controls */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                      Position QR code in the center
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
                  <strong>QR Code Tips:</strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Ensure the QR code is well-lit and in focus</li>
                    <li>• Hold camera steady when scanning</li>
                    <li>• Keep QR code within the viewfinder</li>
                    <li>• Try different angles if scanning fails</li>
                    <li>• Supports URLs, contacts, WiFi, emails, and more</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Scan Result */}
      {qrScanResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                QR Code Detected
              </CardTitle>
              <Button
                onClick={handleClearQRResult}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {qrScanResult.beautified?.type === 'url' && <ExternalLink className="w-4 h-4" />}
                {qrScanResult.beautified?.type === 'email' && <Mail className="w-4 h-4" />}
                {qrScanResult.beautified?.type === 'phone' && <Phone className="w-4 h-4" />}
                {qrScanResult.beautified?.type === 'wifi' && <Wifi className="w-4 h-4" />}
                <Badge variant="secondary">{qrScanResult.beautified?.title}</Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Content:</p>
                <p className="text-sm text-muted-foreground break-all">
                  {qrScanResult.beautified?.displayText || qrScanResult.data}
                </p>
              </div>

              {qrScanResult.beautified?.type === 'wifi' && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border">
                  <p className="text-sm font-medium">Network Details:</p>
                  <p className="text-xs">SSID: {qrScanResult.beautified.ssid}</p>
                  {qrScanResult.beautified.password && (
                    <p className="text-xs">Password: {qrScanResult.beautified.password}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleQRAction(qrScanResult.beautified)}
                className="flex-1"
              >
                {qrScanResult.beautified?.type === 'url' && 'Open Link'}
                {qrScanResult.beautified?.type === 'email' && 'Send Email'}
                {qrScanResult.beautified?.type === 'phone' && 'Call Number'}
                {qrScanResult.beautified?.type === 'wifi' && 'Copy Password'}
                {qrScanResult.beautified?.type === 'text' && 'Copy Text'}
                {qrScanResult.beautified?.type === 'contact' && 'Copy Contact'}
              </Button>
              <Button
                onClick={() => copyToClipboard(qrScanResult.data)}
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Raw
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code History */}
      {qrHistory && qrHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent QR Codes ({qrHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {qrHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.beautifiedData?.type === 'url' && <ExternalLink className="w-3 h-3" />}
                      {item.beautifiedData?.type === 'email' && <Mail className="w-3 h-3" />}
                      {item.beautifiedData?.type === 'phone' && <Phone className="w-3 h-3" />}
                      {item.beautifiedData?.type === 'wifi' && <Wifi className="w-3 h-3" />}
                      <Badge variant="outline" className="text-xs">
                        {item.beautifiedData?.title}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.beautifiedData?.displayText || item.rawData}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <Button
                      onClick={() => handleQRAction(item.beautifiedData)}
                      variant="ghost"
                      size="sm"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => copyToClipboard(item.rawData)}
                      variant="ghost"
                      size="sm"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteQRHistory(item.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default QRCodeScanner