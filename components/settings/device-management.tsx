"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Wifi, WifiOff, MoreVertical, Edit, Trash2, Info, Smartphone, Monitor, Tablet, Globe, CheckCircle, AlertCircle, Clock, Database, Calendar } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

interface Device {
  deviceId: string
  deviceName: string
  lastSyncAt: number
  syncVersion: string
  isActive: boolean
  isCurrentDevice: boolean
}

interface DeviceManagementProps {
  devices: Device[]
  userId: string
  currentDeviceId: string | null
}

export function DeviceManagement({ devices, userId, currentDeviceId }: DeviceManagementProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [newDeviceName, setNewDeviceName] = useState("")

  // Mutations
  const updateDeviceStatusMutation = useMutation(api.walletData.updateDeviceStatus)
  const deleteDeviceMutation = useMutation(api.walletData.deleteDevice)
  const renameDeviceMutation = useMutation(api.walletData.renameDevice)

  // Queries
  const deviceDetails = useQuery(
    api.walletData.getDeviceDetails,
    selectedDevice ? { userId: userId as any, deviceId: selectedDevice.deviceId } : "skip"
  )

  // Helper functions
  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName.toLowerCase()
    if (name.includes('phone') || name.includes('mobile') || name.includes('android') || name.includes('ios')) {
      return <Smartphone className="w-4 h-4" />
    }
    if (name.includes('tablet') || name.includes('ipad')) {
      return <Tablet className="w-4 h-4" />
    }
    if (name.includes('desktop') || name.includes('windows') || name.includes('mac') || name.includes('linux')) {
      return <Monitor className="w-4 h-4" />
    }
    return <Globe className="w-4 h-4" />
  }

  const formatLastSyncTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const formatDataSize = (bytes: number) => {
    if (bytes === 0) return "No data"
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  const getDeviceStatusColor = (device: Device) => {
    if (device.deviceId === currentDeviceId) return "bg-primary/10 text-primary border-primary/20"
    if (device.isActive) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800"
    return "bg-muted text-muted-foreground border-border"
  }

  // Event handlers
  const handleToggleDeviceStatus = async (device: Device, isActive: boolean) => {
    try {
      await updateDeviceStatusMutation({
        userId: userId as any,
        deviceId: device.deviceId,
        isActive,
      })
      toast({
        title: isActive ? "Device Enabled" : "Device Paused",
        description: `${device.deviceName} ${isActive ? 'will now sync' : 'sync paused'}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update device status.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return

    try {
      const result = await deleteDeviceMutation({
        userId: userId as any,
        deviceId: selectedDevice.deviceId,
      })

      if (result.success) {
        toast({
          title: "Device Removed",
          description: `${result.deviceName || selectedDevice.deviceName} has been removed from your sync account.`,
        })
        setShowDeleteDialog(false)
        setSelectedDevice(null)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove device.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove device.",
        variant: "destructive",
      })
    }
  }

  const handleRenameDevice = async () => {
    if (!selectedDevice || !newDeviceName.trim()) return

    try {
      const result = await renameDeviceMutation({
        userId: userId as any,
        deviceId: selectedDevice.deviceId,
        newName: newDeviceName.trim(),
      })

      if (result.success) {
        toast({
          title: "Device Renamed",
          description: `Device renamed from "${result.oldName}" to "${result.newName}".`,
        })
        setShowRenameDialog(false)
        setSelectedDevice(null)
        setNewDeviceName("")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to rename device.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename device.",
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (device: Device) => {
    setSelectedDevice(device)
    setShowDeleteDialog(true)
  }

  const openRenameDialog = (device: Device) => {
    setSelectedDevice(device)
    setNewDeviceName(device.deviceName)
    setShowRenameDialog(true)
  }

  const openDetailsDialog = (device: Device) => {
    setSelectedDevice(device)
    setShowDetailsDialog(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Connected Devices ({devices.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Manage devices connected to your Convex sync account
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {devices.map((device) => {
          const isCurrentDevice = device.deviceId === currentDeviceId
          const isOnline = Date.now() - device.lastSyncAt < 5 * 60 * 1000 // 5 minutes

          return (
            <div key={device.deviceId} className={`p-3 border rounded-lg transition-all duration-200 hover:shadow-sm ${
              isCurrentDevice ? 'ring-1 ring-primary/30 bg-primary/5' : 'hover:bg-muted/30'
            }`}>
              <div className="flex items-center justify-between gap-3">
                {/* Device Icon & Basic Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-md ${
                    isCurrentDevice ? 'bg-primary/10' :
                    device.isActive ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-muted'
                  }`}>
                    {getDeviceIcon(device.deviceName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">
                        {device.deviceName}
                      </p>
                      {isCurrentDevice && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          Current
                        </Badge>
                      )}
                      {isOnline && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">Online</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatLastSyncTime(device.lastSyncAt)}</span>
                      <span>v{device.syncVersion}</span>
                      <Badge
                        variant={device.isActive ? "default" : "outline"}
                        className={`text-xs px-1.5 py-0.5 ${
                          device.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {device.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Device Actions */}
                <div className="flex items-center gap-2">
                  {!isCurrentDevice && (
                    <>
                      <Switch
                        checked={device.isActive}
                        onCheckedChange={(checked) => handleToggleDeviceStatus(device, checked)}
                        className="scale-75"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openDetailsDialog(device)} className="text-xs">
                            <Info className="w-3 h-3 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openRenameDialog(device)} className="text-xs">
                            <Edit className="w-3 h-3 mr-2" />
                            Rename Device
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(device)}
                            className="text-destructive focus:text-destructive text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Remove Device
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No devices connected yet</p>
          <p className="text-xs">Devices will appear here once they sync</p>
        </div>
      )}

      {/* Delete Device Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Remove Device
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{selectedDevice?.deviceName}" from your sync account?
              This device will no longer receive updates, but any existing data will remain on the device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDevice} className="flex-1">
              Remove Device
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Device Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Rename Device
            </DialogTitle>
            <DialogDescription>
              Enter a new name for "{selectedDevice?.deviceName}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="Enter device name"
                maxLength={50}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleRenameDevice}
              disabled={!newDeviceName.trim() || newDeviceName === selectedDevice?.deviceName}
              className="flex-1"
            >
              Rename
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Device Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Device Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about {selectedDevice?.deviceName}
            </DialogDescription>
          </DialogHeader>

          {deviceDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Device ID</Label>
                  <p className="text-sm font-mono break-all">{deviceDetails.deviceId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={deviceDetails.isActive ? "default" : "secondary"}>
                    {deviceDetails.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Sync</Label>
                  <p className="text-sm">{new Date(deviceDetails.lastSyncAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Size</Label>
                  <p className="text-sm">{formatDataSize(deviceDetails.dataSize)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sync Version</Label>
                  <p className="text-sm">v{deviceDetails.syncVersion}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">First Seen</Label>
                  <p className="text-sm">{new Date(deviceDetails.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground">
                <p>This device was first connected to your sync account on {new Date(deviceDetails.createdAt).toLocaleDateString()}.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="flex-1">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
