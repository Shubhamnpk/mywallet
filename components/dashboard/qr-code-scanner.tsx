"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Upload, Scan, X, CheckCircle, AlertCircle, Loader2, RotateCcw, Square, QrCode, Copy, ExternalLink, Phone, Mail, Wifi } from "lucide-react"

// QR Code interfaces
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [qrScanResult, setQrScanResult] = useState<QRScanResult | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isInitializingCamera, setIsInitializingCamera] = useState(false)
  const qrVideoRef = useRef<HTMLVideoElement>(null)
  const qrStreamRef = useRef<MediaStream | null>(null)
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const scanAnimRef = useRef<number | null>(null)
  const lastScannedRef = useRef<string | null>(null)
  const jsQRRef = useRef<any>(null)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

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

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (qrStreamRef.current) {
        qrStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = null
      }
      if (scanAnimRef.current) {
        cancelAnimationFrame(scanAnimRef.current)
        scanAnimRef.current = null
      }
    }
  }, [])

  // List cameras
  const listCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const vids = devices.filter(d => d.kind === 'videoinput')
      setAvailableCameras(vids)
      return vids
    } catch (e) {
      return [] as MediaDeviceInfo[]
    }
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

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
        setQrScanResult(null)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  // Check if camera is supported
  const isCameraSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }, [])

  // Start camera
  const startQRCamera = useCallback(async () => {
    if (!isCameraSupported()) {
      toast.error('Camera is not supported in this browser')
      return
    }

    setIsInitializingCamera(true)
    try {
      // Stop any existing stream
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

  const stream = await navigator.mediaDevices.getUserMedia(constraints)
      qrStreamRef.current = stream

      // Set the stream to video element
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream
        // try to play and then start scanning loop
        try {
          await qrVideoRef.current.play()
        } catch (e) {
          // ignore play errors; scanning will start when video has data
        }
      }

  // determine active device id and torch support
  const track = stream.getVideoTracks()[0]
  const settings = track.getSettings()
  const deviceId = (settings as any).deviceId || null
  setCurrentDeviceId(deviceId)
  // check torch capability
  const caps = (track as any).getCapabilities?.()
  setTorchAvailable(!!(caps && caps.torch))

  setIsCameraActive(true)
      toast.success('Camera ready - live scanning started')
      // start live scan loop
  await listCameras()
  startLiveScan()
    } catch (error) {
      console.error('Camera error:', error)
      // Provide specific error messages
      let errorMessage = 'Camera access failed'
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.'
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.'
        } else {
          errorMessage = `Camera error: ${error.message}`
        }
      }
      toast.error(errorMessage)
    } finally {
      setIsInitializingCamera(false)
    }
  }, [cameraFacingMode, isCameraSupported])

  // Toggle torch if supported
  const toggleTorch = useCallback(async () => {
    if (!qrStreamRef.current) return
    const track = qrStreamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const newState = !torchOn
      await (track as any).applyConstraints({ advanced: [{ torch: newState }] })
      setTorchOn(newState)
      toast.info(newState ? 'Flashlight enabled' : 'Flashlight disabled')
      onFlashlightToggle?.()
    } catch (e) {
      console.warn('Torch toggle failed', e)
      toast.error('Flashlight not supported on this device')
    }
  }, [torchOn, onFlashlightToggle])

  const drawDetectionBox = useCallback((location: any, ctx: CanvasRenderingContext2D) => {
    try {
      ctx.lineWidth = 4
      ctx.strokeStyle = '#22c55e'
      ctx.beginPath()
      ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y)
      ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y)
      ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y)
      ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y)
      ctx.closePath()
      ctx.stroke()
    } catch (e) {
      // ignore
    }
  }, [])

  // Live scan loop similar to the jsQR demo
  const startLiveScan = useCallback(() => {
    if (!qrVideoRef.current || !qrCanvasRef.current || !jsQRRef.current) return
    const canvas = qrCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const loop = () => {
      if (!qrVideoRef.current) return
      if (qrVideoRef.current.readyState === qrVideoRef.current.HAVE_ENOUGH_DATA) {
        canvas.width = qrVideoRef.current.videoWidth
        canvas.height = qrVideoRef.current.videoHeight
        ctx.drawImage(qrVideoRef.current, 0, 0, canvas.width, canvas.height)
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          if (code) {
            drawDetectionBox(code.location, ctx)
            if (code.data && code.data !== lastScannedRef.current) {
              lastScannedRef.current = code.data
              const beautified = beautifyQRData(code.data)
              const result: QRScanResult = {
                data: code.data,
                timestamp: Date.now(),
                type: beautified.type,
                beautified
              }
              setQrScanResult(result)
              onScanResult(result)
              toast.success(`QR Code detected: ${beautified.title}`)
              // Stop scanning after successful detection from image
              onScanningChange(false)
              // Stop scanning and camera after successful detection
              stopQRCamera()
              onScanningChange(false)
              return
            }
          }
        } catch (e) {
          // ignore image processing errors
        }
      }
      scanAnimRef.current = requestAnimationFrame(loop)
    }

    if (scanAnimRef.current) cancelAnimationFrame(scanAnimRef.current)
    scanAnimRef.current = requestAnimationFrame(loop)
  }, [beautifyQRData, drawDetectionBox, onScanResult])

  const stopQRCamera = useCallback(() => {
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach(track => track.stop())
      qrStreamRef.current = null
    }
    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null
    }
    if (scanAnimRef.current) {
      cancelAnimationFrame(scanAnimRef.current)
      scanAnimRef.current = null
    }
    setIsCameraActive(false)
    toast.info('Camera stopped')
  }, [])

  const switchQRCamera = useCallback(() => {
    onSwitchCamera?.()
    // if we have multiple cameras, cycle to the next one
    if (availableCameras.length < 2) {
      // fallback: restart with facing mode
      setTimeout(() => startQRCamera(), 100)
      return
    }
    const idx = availableCameras.findIndex(c => c.deviceId === currentDeviceId)
    const next = availableCameras[(idx + 1) % availableCameras.length]
    // restart with selected deviceId
    stopQRCamera()
    setTimeout(() => startQRCameraWithDevice(next.deviceId), 150)
  }, [onSwitchCamera, startQRCamera])

  // helper to start camera with specific device id
  const startQRCameraWithDevice = useCallback(async (deviceId?: string) => {
    if (!isCameraSupported()) {
      toast.error('Camera is not supported in this browser')
      return
    }

    setIsInitializingCamera(true)
    try {
      if (qrStreamRef.current) {
        qrStreamRef.current.getTracks().forEach(track => track.stop())
        qrStreamRef.current = null
      }

      const constraints: any = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: deviceId ? undefined : cameraFacingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      qrStreamRef.current = stream
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream
        try { await qrVideoRef.current.play() } catch {}
      }

      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()
      const devId = (settings as any).deviceId || deviceId || null
      setCurrentDeviceId(devId)
      const caps = (track as any).getCapabilities?.()
      setTorchAvailable(!!(caps && caps.torch))

      setIsCameraActive(true)
      await listCameras()
      startLiveScan()
    } catch (error) {
      console.error('Camera error:', error)
      toast.error('Camera access failed')
    } finally {
      setIsInitializingCamera(false)
    }
  }, [cameraFacingMode, isCameraSupported, listCameras, startLiveScan])

  // Capture image from camera
  const captureQRImage = useCallback(() => {
    if (!qrVideoRef.current) {
      toast.error('Camera not ready. Please try again.')
      return
    }

    if (!qrCanvasRef.current) {
      toast.error('Capture failed. Please try again.')
      return
    }

    const canvas = qrCanvasRef.current
    const video = qrVideoRef.current

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

      const imageData = canvas.toDataURL('image/png')
      setSelectedImage(imageData)
      setQrScanResult(null)
      stopQRCamera()
      toast.success('Photo captured! Ready to scan QR code.')
    } catch (error) {
      toast.error('Failed to capture photo. Please try again.')
    }
  }, [stopQRCamera])

  // Process the selected image
  const processQRImage = useCallback(async () => {
    if (!selectedImage) return

    setIsProcessing(true)
    try {
      toast.info('Scanning QR code...')

      // Create image element
      const img = new Image()
      img.src = selectedImage

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
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Scan for QR code
      const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })

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
        toast.success(`QR Code detected: ${beautified.title}`)
      } else {
        toast.error('No QR code found in the image')
      }
    } catch (error) {
      console.error('QR processing error:', error)
      toast.error('Failed to scan QR code')
    } finally {
      setIsProcessing(false)
    }
  }, [selectedImage, beautifyQRData, onScanResult])

  // Clear QR result
  const clearQRResult = useCallback(() => {
    setQrScanResult(null)
  }, [])

  // Reset scanner
  const resetQRScanner = useCallback(() => {
    setSelectedImage(null)
    setQrScanResult(null)
    setIsCameraActive(false)
    setIsInitializingCamera(false)
  }, [])

  return (
    <div className="space-y-6">
      {/* Image Selection */}
      {!selectedImage && !isCameraActive && !isInitializingCamera && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Button
                onClick={() => qrFileInputRef.current?.click()}
                variant="outline"
                className="h-20 sm:h-24 flex flex-col gap-1 sm:gap-2 p-3 sm:p-4"
              >
                <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm">Upload</span>
              </Button>

              <Button
                onClick={startQRCamera}
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
              ref={qrFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
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
                  onClick={switchQRCamera}
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
                  onClick={stopQRCamera}
                  variant="outline"
                  size="sm"
                  disabled={isInitializingCamera}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Stop
                </Button>

                {/* Camera select */}
                <select
                  aria-label="Choose camera"
                  value={currentDeviceId ?? ''}
                  onChange={async (e) => {
                    const id = e.target.value || undefined
                    stopQRCamera()
                    await startQRCameraWithDevice(id)
                  }}
                  className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-lg border"
                  disabled={isInitializingCamera || availableCameras.length === 0}
                >
                  <option value="">Default</option>
                  {availableCameras.map(cam => (
                    <option key={cam.deviceId} value={cam.deviceId}>{cam.label || cam.deviceId}</option>
                  ))}
                </select>

                {/* Torch / flashlight toggle */}
                <Button
                  onClick={toggleTorch}
                  variant="outline"
                  size="sm"
                  disabled={!torchAvailable || isInitializingCamera}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">{torchOn ? 'Flash Off' : 'Flash On'}</span>
                  <span className="sm:hidden">{torchOn ? 'Off' : 'On'}</span>
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
                className={`w-full h-64 sm:h-80 object-cover rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''} bg-black`}
                onError={(e) => {
                  toast.error('Video display error. Please refresh the page and try again.')
                  stopQRCamera()
                }}
              />
              <canvas ref={qrCanvasRef} className="hidden" />

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
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      scanning...
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
                    <li>• Position QR code in the center square</li>
                    <li>• Ensure good lighting for better detection</li>
                    <li>• Hold camera steady when capturing</li>
                    <li>• QR code should be clearly visible</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Image Preview */}
      {selectedImage && !isCameraActive && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">QR Code Preview</CardTitle>
              <Button
                onClick={resetQRScanner}
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
                alt="QR Code"
                className="w-full max-h-64 object-contain rounded-lg border"
              />
            </div>

            {!qrScanResult && (
              <Button
                onClick={processQRImage}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning QR Code...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </>
                )}
              </Button>
            )}
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
                onClick={clearQRResult}
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

            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => handleQRAction(qrScanResult.beautified)}
                className="flex-1 text-xs sm:text-sm"
                size="sm"
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
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Copy Raw</span>
                <span className="sm:hidden">Copy</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default QRCodeScanner