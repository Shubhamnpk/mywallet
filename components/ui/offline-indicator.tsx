"use client"

import { useOfflineMode } from "@/hooks/use-offline-mode"
import { useServiceWorker } from "@/hooks/use-service-worker"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  AlertCircle,
  CheckCircle2
} from "lucide-react"

export function OfflineIndicator() {
  // Moved to header as OfflineBadge
  return null
}