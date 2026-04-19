"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Upload, Scan, X, CheckCircle, AlertCircle, Loader2, RotateCcw, Square, QrCode, Copy, ExternalLink, Phone, Mail, Wifi, Repeat } from "lucide-react"
type QRContentType = 'url' | 'email' | 'phone' | 'wifi' | 'contact' | 'calendar' | 'bitcoin' | 'text'
interface QRPoint {
  x: number
  y: number
}
interface QRCodeLocation {
  topLeftCorner: QRPoint
  topRightCorner: QRPoint
  bottomRightCorner: QRPoint
  bottomLeftCorner: QRPoint
}

interface DecodedQRCode {
  data: string
  location: QRCodeLocation
}

interface QRBeautifiedData {
  type: QRContentType
  title: string
  displayText: string
  url?: string
  email?: string | null
  phone?: string | null
  ssid?: string
  password?: string | null
  security?: string
  name?: string | null
  summary?: string
  startDate?: string | null
  location?: string | null
  icsData?: string
  address?: string
  content?: string
}

interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean
}

interface TorchTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean
}

interface QRScanResult {
  data: string
  timestamp: number
  type: string
  beautified?: QRBeautifiedData
}

interface QRCodeScannerProps {
  isScanning: boolean
  onScanResult: (result: QRScanResult) => void
  onScanningChange: (scanning: boolean) => void
  cameraFacingMode: 'environment' | 'user'
  isFlashlightOn: boolean
  onFlashlightToggle: (enabled: boolean) => void
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
  const [showScannerView, setShowScannerView] = useState(false)
  const qrVideoRef = useRef<HTMLVideoElement>(null)
  const qrStreamRef = useRef<MediaStream | null>(null)
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const scanAnimRef = useRef<number | null>(null)
  const lastScannedRef = useRef<string | null>(null)
  const jsQRRef = useRef<((data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: 'attemptBoth' | 'dontInvert' | 'onlyInvert' | 'invertFirst' }) => DecodedQRCode | null) | null>(null)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [continuousScan, setContinuousScan] = useState(false)

  // Load jsQR library
  useEffect(() => {
    const loadJsQR = async () => {
      try {
        const jsQR = (await import('jsqr')).default
        jsQRRef.current = jsQR
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

  // Preload available cameras so camera select can populate early.
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    void listCameras()
    const handleDeviceChange = () => {
      void listCameras()
    }

    navigator.mediaDevices.addEventListener?.('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', handleDeviceChange)
    }
  }, [listCameras])

  // Beautify QR code data
  const beautifyQRData = useCallback((data: string): QRBeautifiedData => {
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

    // Calendar event detection (iCal format)
    if (data.includes('BEGIN:VEVENT') || data.includes('DTSTART:') || data.includes('SUMMARY:')) {
      const summaryMatch = data.match(/SUMMARY:([^\n]+)/)
      const startMatch = data.match(/DTSTART:([^\n]+)/)
      const locationMatch = data.match(/LOCATION:([^\n]+)/)

      return {
        type: 'calendar',
        title: 'Calendar Event',
        summary: summaryMatch ? summaryMatch[1] : 'Event',
        startDate: startMatch ? startMatch[1] : null,
        location: locationMatch ? locationMatch[1] : null,
        icsData: data,
        displayText: summaryMatch ? summaryMatch[1] : 'Calendar Event'
      }
    }

    // Bitcoin/Satoshi address detection
    if (data.startsWith('bitcoin:') || 
        (data.length >= 26 && data.length <= 35 && /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(data)) ||
        (data.length >= 42 && data.length <= 62 && /^bc1[a-z0-9]{39,59}$/.test(data))) {
      return {
        type: 'bitcoin',
        title: 'Bitcoin Address',
        address: data.replace('bitcoin:', ''),
        displayText: data.length > 20 ? `${data.substring(0, 17)}...` : data
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
  const handleQRAction = useCallback((beautified: QRBeautifiedData) => {
    switch (beautified.type) {
      case 'url':
        window.open(beautified.url, '_blank', 'noopener,noreferrer')
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
      case 'calendar':
        copyToClipboard(beautified.icsData || beautified.displayText)
        break
      case 'bitcoin':
        copyToClipboard(beautified.address ?? beautified.displayText)
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

  // Bind stream to video element. This handles fast camera starts where
  // getUserMedia resolves before the video ref is mounted.
  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    const video = qrVideoRef.current
    if (!video) return false

    if (video.srcObject !== stream) {
      video.srcObject = stream
    }

    try {
      await video.play()
    } catch {
      // Ignore autoplay/play races; another effect retry will handle it.
    }

    return true
  }, [])

  // Ensure scanner UI is painted before heavy camera initialization starts.
  const waitForNextPaint = useCallback(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  }, [])

  const stopQRCamera = useCallback((options?: { silent?: boolean; notifyParent?: boolean; keepScannerView?: boolean }) => {
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
    setIsInitializingCamera(false)
    if (!options?.keepScannerView) {
      setShowScannerView(false)
    }
    setTorchAvailable(false)
    setCurrentDeviceId(null)

    if (isFlashlightOn) {
      onFlashlightToggle(false)
    }

    if (options?.notifyParent !== false) {
      onScanningChange(false)
    }
    if (!options?.silent) {
      toast.info('Camera stopped')
    }
  }, [isFlashlightOn, onFlashlightToggle, onScanningChange])

  // Toggle torch if supported
  const toggleTorch = useCallback(async () => {
    if (!qrStreamRef.current) return
    const track = qrStreamRef.current.getVideoTracks()[0]
    if (!track) return
    const torchTrack = track as MediaStreamTrack & {
      getCapabilities?: () => TorchTrackCapabilities
    }
    try {
      const newState = !isFlashlightOn
      await torchTrack.applyConstraints({ advanced: [{ torch: newState } as TorchConstraintSet] })
      toast.info(newState ? 'Flashlight enabled' : 'Flashlight disabled')
      onFlashlightToggle(newState)
    } catch (e) {
      console.warn('Torch toggle failed', e)
      toast.error('Flashlight not supported on this device')
    }
  }, [isFlashlightOn, onFlashlightToggle])

  const drawDetectionBox = useCallback((location: QRCodeLocation, ctx: CanvasRenderingContext2D) => {
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
    const jsQR = jsQRRef.current
    if (!qrVideoRef.current || !qrCanvasRef.current || !jsQR) return
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
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
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

              // Add haptic feedback if supported
              if ('vibrate' in navigator) {
                navigator.vibrate(200)
              }

              // Stop scanning after successful detection unless continuous scan is enabled
              if (!continuousScan) {
                stopQRCamera()
                return
              } else {
                // In continuous mode, reset lastScanned after a delay to allow rescanning same code
                setTimeout(() => {
                  lastScannedRef.current = null
                }, 2000)
              }
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
  }, [beautifyQRData, continuousScan, drawDetectionBox, onScanResult, stopQRCamera])

  // helper to start camera with specific device id
  const startQRCameraWithDevice = useCallback(async (deviceId?: string) => {
    setShowScannerView(true)
    await waitForNextPaint()
    if (!isCameraSupported()) {
      toast.error('Camera is not supported in this browser')
      setShowScannerView(false)
      return
    }

    setIsInitializingCamera(true)
    try {
      if (qrStreamRef.current) {
        qrStreamRef.current.getTracks().forEach(track => track.stop())
        qrStreamRef.current = null
      }

      const constraints: MediaStreamConstraints = {
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
      lastScannedRef.current = null
      const attached = await attachStreamToVideo(stream)

      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()
      const devId = settings.deviceId || deviceId || null
      setCurrentDeviceId(devId)
      const caps = track.getCapabilities?.() as TorchTrackCapabilities | undefined
      setTorchAvailable(!!(caps && caps.torch))

      setIsCameraActive(true)
      onScanningChange(true)
      void listCameras()
      if (attached) {
        startLiveScan()
      }
    } catch (error) {
      console.error('Camera error:', error)
      toast.error('Camera access failed')
      setShowScannerView(false)
    } finally {
      setIsInitializingCamera(false)
    }
  }, [attachStreamToVideo, cameraFacingMode, isCameraSupported, listCameras, onScanningChange, startLiveScan, waitForNextPaint])

  // Start camera
  const startQRCamera = useCallback(async () => {
    setShowScannerView(true)
    await waitForNextPaint()
    if (!isCameraSupported()) {
      toast.error('Camera is not supported in this browser')
      setShowScannerView(false)
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
      lastScannedRef.current = null
      const attached = await attachStreamToVideo(stream)

      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()
      const deviceId = settings.deviceId || null
      setCurrentDeviceId(deviceId)
      const caps = track.getCapabilities?.() as TorchTrackCapabilities | undefined
      setTorchAvailable(!!(caps && caps.torch))

      setIsCameraActive(true)
      onScanningChange(true)
      toast.success('Camera ready - live scanning started')
      void listCameras()
      if (attached) {
        startLiveScan()
      }
    } catch (error) {
      console.error('Camera error:', error)
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
      setShowScannerView(false)
    } finally {
      setIsInitializingCamera(false)
    }
  }, [attachStreamToVideo, cameraFacingMode, isCameraSupported, listCameras, onScanningChange, startLiveScan, waitForNextPaint])

  const switchQRCamera = useCallback(() => {
    onSwitchCamera?.()

    if (availableCameras.length < 2) {
      stopQRCamera({ silent: true, notifyParent: false, keepScannerView: true })
      setTimeout(() => startQRCamera(), 100)
      return
    }

    const idx = availableCameras.findIndex(c => c.deviceId === currentDeviceId)
    const next = availableCameras[(idx + 1) % availableCameras.length]
    stopQRCamera({ silent: true, notifyParent: false, keepScannerView: true })
    setTimeout(() => startQRCameraWithDevice(next.deviceId), 150)
  }, [availableCameras, currentDeviceId, onSwitchCamera, startQRCamera, startQRCameraWithDevice, stopQRCamera])

  // Keep scanner aligned with parent state changes.
  useEffect(() => {
    if (isScanning && !isCameraActive && !isInitializingCamera && !selectedImage) {
      startQRCamera()
      return
    }
    if (!isScanning && (isCameraActive || isInitializingCamera)) {
      stopQRCamera({ silent: true, notifyParent: false })
    }
  }, [isCameraActive, isInitializingCamera, isScanning, selectedImage, startQRCamera, stopQRCamera])

  // Rebind stream when camera UI mounts/re-mounts (e.g. reopening modal).
  useEffect(() => {
    if (!qrStreamRef.current) return
    if (!isCameraActive && !isInitializingCamera) return

    let cancelled = false

    const syncVideo = async () => {
      const attached = await attachStreamToVideo(qrStreamRef.current as MediaStream)
      if (!cancelled && attached) {
        startLiveScan()
      }
    }

    syncVideo()
    return () => {
      cancelled = true
    }
  }, [attachStreamToVideo, isCameraActive, isInitializingCamera, startLiveScan])

  // Process the selected image
  const processQRImage = useCallback(async () => {
    if (!selectedImage) return
    if (!jsQRRef.current) {
      toast.error('Scanner not ready yet. Please wait a moment and try again.')
      return
    }

    setIsProcessing(true)
    try {
      toast.info('Scanning QR code...')
      // rest of the scanning logic
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
    setShowScannerView(false)
    stopQRCamera({ silent: true })
  }, [stopQRCamera])

  return (
    <div className="space-y-6">
       {/* Image Selection */}
      {!selectedImage && !showScannerView && !isCameraActive && !isInitializingCamera && (
        <Card className="border-0 sm:border shadow-lg">
          <CardHeader className="pb-3 sm:pb-6 text-center">
            <CardTitle className="text-lg sm:text-xl">
              <div className="flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
                QR Code Scanner
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Choose how you want to scan the QR code
            </p>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Button
                onClick={() => qrFileInputRef.current?.click()}
                variant="outline"
                className="h-32 sm:h-36 flex flex-col gap-3 sm:gap-4 p-6 sm:p-8 border-2 hover:border-primary transition-colors"
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-full">
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-base sm:text-lg font-semibold">Upload File</span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Select from your device
                </span>
              </Button>

              <Button
                onClick={startQRCamera}
                variant="outline"
                className="h-32 sm:h-36 flex flex-col gap-3 sm:gap-4 p-6 sm:p-8 border-2 hover:border-primary transition-colors"
                disabled={isInitializingCamera}
              >
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-full">
                  {isInitializingCamera ? (
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <span className="text-base sm:text-lg font-semibold">
                  {isInitializingCamera ? 'Starting Camera...' : 'Scan with Camera'}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Use your device camera
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
      {(showScannerView || isCameraActive || isInitializingCamera) && (
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
                  onClick={() => stopQRCamera()}
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

                {/* Continuous scan toggle */}
                <Button
                  onClick={() => setContinuousScan(!continuousScan)}
                  variant={continuousScan ? "default" : "outline"}
                  size="sm"
                  disabled={isInitializingCamera}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Repeat className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">{continuousScan ? 'Continuous' : 'Single'}</span>
                  <span className="sm:hidden">{continuousScan ? 'Cont' : 'Single'}</span>
                </Button>

                {/* Torch / flashlight toggle */}
                <Button
                  onClick={toggleTorch}
                  variant="outline"
                  size="sm"
                  disabled={!torchAvailable || isInitializingCamera}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">{isFlashlightOn ? 'Flash Off' : 'Flash On'}</span>
                  <span className="sm:hidden">{isFlashlightOn ? 'Off' : 'On'}</span>
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-white rounded-lg">
                  <div className="text-center px-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <div className="text-sm font-medium">Starting camera...</div>
                    <div className="text-xs mt-1 opacity-80">Please allow camera permission if prompted</div>
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
                    <li>- Position QR code in the center square</li>
                    <li>- Ensure good lighting for better detection</li>
                    <li>- Hold camera steady when capturing</li>
                    <li>- QR code should be clearly visible</li>
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
                {qrScanResult.beautified?.type === 'calendar' && <CheckCircle className="w-4 h-4" />}
                {qrScanResult.beautified?.type === 'bitcoin' && <QrCode className="w-4 h-4" />}
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

              {qrScanResult.beautified?.type === 'calendar' && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded border">
                  <p className="text-sm font-medium">Event Details:</p>
                  <p className="text-xs">Summary: {qrScanResult.beautified.summary}</p>
                  {qrScanResult.beautified.startDate && (
                    <p className="text-xs">Start: {new Date(qrScanResult.beautified.startDate).toLocaleString()}</p>
                  )}
                  {qrScanResult.beautified.location && (
                    <p className="text-xs">Location: {qrScanResult.beautified.location}</p>
                  )}
                </div>
              )}

              {qrScanResult.beautified?.type === 'bitcoin' && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded border">
                  <p className="text-sm font-medium">Bitcoin Address:</p>
                  <p className="text-xs break-all">{qrScanResult.beautified.address}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => {
                  if (qrScanResult.beautified) {
                    handleQRAction(qrScanResult.beautified)
                  }
                }}
                className="flex-1 text-xs sm:text-sm"
                size="sm"
                disabled={!qrScanResult.beautified}
              >
                {qrScanResult.beautified?.type === 'url' && 'Open Link'}
                {qrScanResult.beautified?.type === 'email' && 'Send Email'}
                {qrScanResult.beautified?.type === 'phone' && 'Call Number'}
                {qrScanResult.beautified?.type === 'wifi' && 'Copy Password'}
                {qrScanResult.beautified?.type === 'calendar' && 'Copy Event'}
                {qrScanResult.beautified?.type === 'bitcoin' && 'Copy Address'}
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

