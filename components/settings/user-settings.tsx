"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useWalletData } from "@/contexts/wallet-data-context"
import { LogOut, Trash2, Upload, Save, Plus, PencilLine, Camera, X, User, ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { CURRENCIES, getCurrencySymbol, getCurrencyLabel } from "@/lib/currency"
import { DeleteDataDialog } from "./delete-data-dialog"

export function UserProfileSettings({ highlightQuery = "" }: { highlightQuery?: string }) {
  const { userProfile, updateUserProfile, clearAllData } = useWalletData()
  const [formData, setFormData] = useState<any>(
    userProfile || {
      name: "",
      currency: "USD",
      customCurrency: { code: "", symbol: "", name: "" },
      monthlyEarning: 0,
      workingHoursPerDay: 8,
      workingDaysPerMonth: 22,
    },
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [showCustomCurrency, setShowCustomCurrency] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (userProfile) {
      // merge to ensure customCurrency exists
      setFormData({ ...userProfile, customCurrency: userProfile.customCurrency || { code: "", symbol: "", name: "" } })
      setShowCustomCurrency(userProfile.currency === "CUSTOM")
    }
  }, [userProfile])

  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(userProfile))
  }, [formData, userProfile])

  const updateField = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
  }

  const handleCurrencyChange = (value: string) => {
    updateField("currency", value)
    setShowCustomCurrency(value === "CUSTOM")
  }

  const getCurrentCurrencySymbol = useMemo(() => {
    return getCurrencySymbol(formData?.currency, formData?.customCurrency)
  }, [formData?.currency, formData?.customCurrency])

  const hourlyRate = useMemo(() => {
    const hours = formData.workingHoursPerDay * formData.workingDaysPerMonth
    const rate = hours > 0 ? formData.monthlyEarning / hours : 0
    return isNaN(rate) ? 0 : rate
  }, [formData.monthlyEarning, formData.workingHoursPerDay, formData.workingDaysPerMonth])

  const perMinuteRate = useMemo(() => {
    const rate = hourlyRate > 0 ? hourlyRate / 60 : 0
    return isNaN(rate) ? 0 : rate
  }, [hourlyRate])

  const handleSave = () => {
    updateUserProfile(formData)
    toast({ title: "Profile Updated", description: "Your profile settings have been saved successfully." })
    setEditMode(false)
  }

  const handleLogout = () => {
    localStorage.removeItem("wallet_session")
    window.location.reload()
  }

  const handleDeleteAccount = () => {
    clearAllData()
    toast({
      title: "Account Deleted",
      description: "All your data has been permanently deleted.",
      variant: "destructive",
    })
    setTimeout(() => window.location.reload(), 1000)
  }

  const handleFileUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleCameraCapture = () => {
    if (cameraInputRef.current) cameraInputRef.current.click()
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setAvatarPreview(result)
        updateField("avatar", result)
        setShowAvatarDialog(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
    updateField("avatar", null)
    setShowAvatarDialog(false)
    toast({
      title: "Avatar removed",
      description: "Your profile picture has been removed.",
    })
  }

  const handleSaveAvatar = () => {
    if (avatarPreview) {
      updateField("avatar", avatarPreview)
    }
    setShowAvatarDialog(false)
    toast({
      title: "Avatar updated",
      description: "Your profile picture has been updated successfully.",
    })
  }

  const getAvatarSrc = () => {
    return avatarPreview || formData.avatar || null
  }

  const getInitials = () => {
    return formData.name
      ? formData.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U"
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="animate-pulse text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>View and manage your profile information</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
            <PencilLine className="w-4 h-4 mr-2" />
            {editMode ? "Cancel" : "Edit Profile"}
          </Button>
        </CardHeader>

        <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Enhanced Avatar Section */}
          <div className="flex flex-col items-center gap-6 lg:col-span-1">
            <div className="relative group">
              {/* Hidden file inputs */}
              {editMode && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    aria-label="Upload avatar image"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="hidden"
                    aria-label="Take photo"
                  />
                </>
              )}

              {/* Avatar with interactive overlay */}
              <div
                className={`relative ${editMode ? 'cursor-pointer' : ''}`}
                onClick={() => editMode && !getAvatarSrc() && handleFileUpload()}
              >
                <Avatar className={`w-32 h-32 ring-4 ${highlightQuery.toLowerCase().includes("avatar") ? "ring-primary" : "ring-primary/10"} shadow-xl transition-all duration-300 group-hover:ring-primary/30 group-hover:shadow-2xl group-hover:scale-105`}>
                  <AvatarImage
                    src={getAvatarSrc() || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary font-bold text-2xl shadow-inner">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>

                {/* Interactive hover overlay */}
                {editMode && (
                  <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex gap-3">
                      {!getAvatarSrc() ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileUpload();
                            }}
                            className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-primary hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                            title="Upload from gallery"
                          >
                            <ImageIcon className="w-6 h-6" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCameraCapture();
                            }}
                            className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-primary hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                            title="Take photo"
                          >
                            <Camera className="w-6 h-6" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAvatar();
                          }}
                          className="w-12 h-12 bg-destructive/90 rounded-full flex items-center justify-center text-white hover:bg-destructive hover:scale-110 transition-all duration-200 shadow-lg"
                          title="Remove avatar"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced status text with better styling */}
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground max-w-xs">
                {editMode ? (
                  getAvatarSrc()
                    ? "Hover over the avatar to manage your photo"
                    : "Click the avatar or hover to add a photo"
                ) : (
                  "Switch to edit mode to change your profile picture"
                )}
              </p>
            </div>
          </div>

          {/* Enhanced Info Section */}
          <div className="lg:col-span-3 space-y-6">
            {!editMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">{formData.name || "Unnamed User"}</h2>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium text-primary">
                        {getCurrencyLabel(formData.currency, formData.customCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Stats */}
                <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {getCurrentCurrencySymbol}{hourlyRate.toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-600/70 dark:text-blue-400/70">Hourly Rate</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formData.workingHoursPerDay}h
                    </div>
                    <div className="text-sm text-green-600/70 dark:text-green-400/70">Daily Hours</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800">
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {formData.workingDaysPerMonth}
                    </div>
                    <div className="text-sm text-purple-600/70 dark:text-purple-400/70">Work Days</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="full-name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className={`h-11 ${highlightQuery.toLowerCase().includes("name") ? "ring-2 ring-primary" : ""}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                    <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                      <SelectTrigger className={`h-11 ${highlightQuery.toLowerCase().includes("currency") ? "ring-2 ring-primary" : ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {showCustomCurrency && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                    <h4 className="text-sm font-medium mb-3">Custom Currency Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="custom-code" className="text-xs">Currency Code</Label>
                        <Input
                          id="custom-code"
                          placeholder="BTC"
                          value={formData.customCurrency?.code || ""}
                          onChange={(e) =>
                            updateField("customCurrency", {
                              ...formData.customCurrency,
                              code: e.target.value.toUpperCase(),
                            })
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="custom-symbol" className="text-xs">Symbol</Label>
                        <Input
                          id="custom-symbol"
                          placeholder="₿"
                          value={formData.customCurrency?.symbol || ""}
                          onChange={(e) =>
                            updateField("customCurrency", {
                              ...formData.customCurrency,
                              symbol: e.target.value,
                            })
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="custom-name" className="text-xs">Full Name</Label>
                        <Input
                          id="custom-name"
                          placeholder="Bitcoin"
                          value={formData.customCurrency?.name || ""}
                          onChange={(e) =>
                            updateField("customCurrency", {
                              ...formData.customCurrency,
                              name: e.target.value,
                            })
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Work Information */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl">Work Information</CardTitle>
              <CardDescription>Configure your work details to calculate time value for transactions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!editMode ? (
            <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {getCurrentCurrencySymbol}{(formData.monthlyEarning || 0).toLocaleString()}
                </div>
                <div className="text-sm text-emerald-600/70 dark:text-emerald-400/70">Monthly Earning</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {formData.workingHoursPerDay}h
                </div>
                <div className="text-sm text-blue-600/70 dark:text-blue-400/70">Hours per Day</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800">
                <div className="text-lg font-bold text-orange-700 dark:text-orange-400">
                  {formData.workingDaysPerMonth}
                </div>
                <div className="text-sm text-orange-600/70 dark:text-orange-400/70">Days per Month</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly-earning" className="text-sm font-medium">Monthly Earning</Label>
                <Input
                  id="monthly-earning"
                  type="number"
                  placeholder="5000"
                  value={formData.monthlyEarning}
                  onChange={(e) => updateField("monthlyEarning", Number(e.target.value))}
                  className={`h-11 ${highlightQuery.toLowerCase().includes("earning") || highlightQuery.toLowerCase().includes("monthly") ? "ring-2 ring-primary" : ""}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours-day" className="text-sm font-medium">Hours per Day</Label>
                <Input
                  id="hours-day"
                  type="number"
                  min="1"
                  max="24"
                  placeholder="8"
                  value={formData.workingHoursPerDay}
                  onChange={(e) => updateField("workingHoursPerDay", Number(e.target.value))}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="days-month" className="text-sm font-medium">Days per Month</Label>
                <Input
                  id="days-month"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="22"
                  value={formData.workingDaysPerMonth}
                  onChange={(e) => updateField("workingDaysPerMonth", Number(e.target.value))}
                  className="h-11"
                />
              </div>
            </div>
          )}

          {/* Enhanced Preview Card */}
          <div className="p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Time Value Calculation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">
                  {getCurrentCurrencySymbol}{hourlyRate.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Your hourly rate</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold text-primary/80">
                  {getCurrentCurrencySymbol}{perMinuteRate.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Per minute value</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <p className="text-sm text-primary/80">
                💡 This helps you understand the time cost of your purchases and make better financial decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Save Changes (only in edit mode) */}
      {editMode && (
        <Card className={`border-0 shadow-lg transition-all duration-300 ${
          hasChanges
            ? "bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 shadow-primary/10"
            : "bg-muted/30"
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full transition-colors ${
                  hasChanges ? "bg-primary animate-pulse" : "bg-muted-foreground/50"
                }`}></div>
                <div>
                  <p className={`text-sm font-medium ${
                    hasChanges ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {hasChanges ? "Unsaved Changes" : "No Changes"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasChanges ? "Don't forget to save your updates" : "All changes are saved"}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                size="lg"
                className={`transition-all duration-200 ${
                  hasChanges
                    ? "bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                {hasChanges ? "Save Changes" : "Saved"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>These actions are irreversible</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Logout</p>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="font-medium text-destructive">Delete Account</p>
            <DeleteDataDialog
              trigger={
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              }
              title="Delete Account"
              description="This will permanently delete your account and all associated data including your PIN, encryption keys, and security settings. This action cannot be undone."
              onConfirm={handleDeleteAccount}
              type="account"
            />
          </div>
        </CardContent>
      </Card>

      {/* Avatar Preview Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preview Avatar</DialogTitle>
            <DialogDescription>
              Review your new profile picture before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            <Avatar className="w-32 h-32 ring-4 ring-primary/20">
              <AvatarImage src={avatarPreview || undefined} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowAvatarDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAvatar}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Avatar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
