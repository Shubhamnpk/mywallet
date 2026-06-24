"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Upload, Scan, X, CheckCircle, Loader2, RotateCcw, Square, QrCode, Copy, ExternalLink, Phone, Mail, Wifi, Repeat, ChevronDown } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { formatAppDateTime, getCalendarSystem } from "@/lib/app-calendar"
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
  const { userProfile } = useWalletData()
  const calendarSystem = getCalendarSystem(userProfile?.calendarSystem)
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
    <div className="space-y-4">
      {/* Initial choice */}
      {!selectedImage && !showScannerView && !isCameraActive && !isInitializingCamera && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => qrFileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 p-6 sm:p-8 hover:border-primary/50 hover:bg-accent/30 transition-all active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30">
              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">Upload File</div>
              <div className="text-xs text-muted-foreground mt-0.5">Select from your device</div>
            </div>
          </button>

          <button
            onClick={startQRCamera}
            disabled={isInitializingCamera}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 p-6 sm:p-8 hover:border-primary/50 hover:bg-accent/30 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950/30">
              {isInitializingCamera ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
              ) : (
                <Camera className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">{isInitializingCamera ? 'Starting...' : 'Scan with Camera'}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Use your device camera</div>
            </div>
          </button>

          <Input ref={qrFileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      )}

      {/* Camera View */}
      {(showScannerView || isCameraActive || isInitializingCamera) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Camera className="w-4 h-4" />
              {cameraFacingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <select
                aria-label="Choose camera"
                value={currentDeviceId ?? ''}
                onChange={async (e) => {
                  const id = e.target.value || undefined
                  stopQRCamera()
                  await startQRCameraWithDevice(id)
                }}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                disabled={isInitializingCamera || availableCameras.length === 0}
              >
                <option value="">Default</option>
                {availableCameras.map(cam => (
                  <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}</option>
                ))}
              </select>
              <button
                onClick={switchQRCamera}
                disabled={isInitializingCamera}
                className="flex items-center gap-1 rounded-lg border border-input px-2 h-8 text-xs hover:bg-accent transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" /> Switch
              </button>
              <button
                onClick={() => setContinuousScan(!continuousScan)}
                disabled={isInitializingCamera}
                className={`flex items-center gap-1 rounded-lg border px-2 h-8 text-xs transition-colors disabled:opacity-50 ${continuousScan ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-accent'}`}
              >
                <Repeat className="w-3 h-3" /> {continuousScan ? 'Cont' : 'Single'}
              </button>
              <button
                onClick={toggleTorch}
                disabled={!torchAvailable || isInitializingCamera}
                className="flex items-center gap-1 rounded-lg border border-input px-2 h-8 text-xs hover:bg-accent transition-colors disabled:opacity-50"
              >
                {isFlashlightOn ? 'Off' : 'Flash'}
              </button>
              <button
                onClick={() => stopQRCamera()}
                disabled={isInitializingCamera}
                className="flex items-center gap-1 rounded-lg border border-input px-2 h-8 text-xs text-destructive hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Square className="w-3 h-3" /> Stop
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={qrVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full aspect-[4/3] object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              onError={() => {
                toast.error('Camera error. Please try again.')
                stopQRCamera()
              }}
            />
            <canvas ref={qrCanvasRef} className="hidden" />

            {isInitializingCamera && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
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
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    scanning...
                  </span>
                </div>
              </>
            )}
          </div>

          <details className="group">
            <summary className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none">
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              Camera tips
            </summary>
            <div className="mt-2 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p>• Position QR code in the center square</p>
              <p>• Ensure good lighting for better detection</p>
              <p>• Hold camera steady when capturing</p>
              <p>• QR code should be clearly visible</p>
            </div>
          </details>
        </div>
      )}

      {/* Selected Image Preview */}
      {selectedImage && !isCameraActive && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Upload className="w-4 h-4" />
              QR Code Preview
            </div>
            <button onClick={resetQRScanner} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border">
            <img src={selectedImage} alt="QR Code" className="w-full max-h-72 object-contain bg-muted/30" />
          </div>
          {!qrScanResult && (
            <button
              onClick={processQRImage}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scanning QR Code...</>
              ) : (
                <><Scan className="w-4 h-4" /> Scan QR Code</>
              )}
            </button>
          )}
        </div>
      )}

      {/* QR Scan Result */}
      {qrScanResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-sm">QR Code Detected</span>
            </div>
            <button onClick={clearQRResult} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {qrScanResult.beautified?.type === 'url' && <ExternalLink className="w-4 h-4 text-blue-500" />}
              {qrScanResult.beautified?.type === 'email' && <Mail className="w-4 h-4 text-blue-500" />}
              {qrScanResult.beautified?.type === 'phone' && <Phone className="w-4 h-4 text-blue-500" />}
              {qrScanResult.beautified?.type === 'wifi' && <Wifi className="w-4 h-4 text-blue-500" />}
              {qrScanResult.beautified?.type === 'calendar' && <CheckCircle className="w-4 h-4 text-blue-500" />}
              {qrScanResult.beautified?.type === 'bitcoin' && <QrCode className="w-4 h-4 text-orange-500" />}
              <Badge variant="secondary">{qrScanResult.beautified?.title}</Badge>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Content</div>
              <p className="text-sm mt-0.5 break-all">{qrScanResult.beautified?.displayText || qrScanResult.data}</p>
            </div>

            {qrScanResult.beautified?.type === 'wifi' && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 px-3 py-2.5 space-y-1">
                <div className="text-xs font-medium">Network Details</div>
                <div className="text-xs flex justify-between"><span className="text-muted-foreground">SSID:</span> <span className="font-mono">{qrScanResult.beautified.ssid}</span></div>
                {qrScanResult.beautified.password && (
                  <div className="text-xs flex justify-between"><span className="text-muted-foreground">Password:</span> <span className="font-mono">{qrScanResult.beautified.password}</span></div>
                )}
              </div>
            )}

            {qrScanResult.beautified?.type === 'calendar' && (
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 px-3 py-2.5 space-y-1">
                <div className="text-xs font-medium">Event Details</div>
                <div className="text-xs"><span className="text-muted-foreground">Summary:</span> {qrScanResult.beautified.summary}</div>
                {qrScanResult.beautified.startDate && <div className="text-xs"><span className="text-muted-foreground">Start:</span> {formatAppDateTime(qrScanResult.beautified.startDate, calendarSystem)}</div>}
                {qrScanResult.beautified.location && <div className="text-xs"><span className="text-muted-foreground">Location:</span> {qrScanResult.beautified.location}</div>}
              </div>
            )}

            {qrScanResult.beautified?.type === 'bitcoin' && (
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 px-3 py-2.5 space-y-1">
                <div className="text-xs font-medium">Bitcoin Address</div>
                <div className="text-xs break-all font-mono">{qrScanResult.beautified.address}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { if (qrScanResult.beautified) handleQRAction(qrScanResult.beautified) }}
              disabled={!qrScanResult.beautified}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {qrScanResult.beautified?.type === 'url' && 'Open Link'}
              {qrScanResult.beautified?.type === 'email' && 'Send Email'}
              {qrScanResult.beautified?.type === 'phone' && 'Call Number'}
              {qrScanResult.beautified?.type === 'wifi' && 'Copy Password'}
              {qrScanResult.beautified?.type === 'calendar' && 'Copy Event'}
              {qrScanResult.beautified?.type === 'bitcoin' && 'Copy Address'}
              {qrScanResult.beautified?.type === 'text' && 'Copy Text'}
              {qrScanResult.beautified?.type === 'contact' && 'Copy Contact'}
            </button>
            <button
              onClick={() => copyToClipboard(qrScanResult.data)}
              className="flex items-center gap-1.5 h-11 rounded-xl border border-input px-4 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default QRCodeScanner

