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
import { Switch } from "@/components/ui/switch"
import { useWalletData } from "@/contexts/wallet-data-context"
import { LogOut, Trash2, Upload, Save, Plus, PencilLine, Camera, X, User, ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { CURRENCIES, getCurrencySymbol, getCurrencyLabel } from "@/lib/currency"
import { DeleteDataDialog } from "./delete-data-dialog"
import { useAchievements } from "@/hooks/use-achievements"
import { AchievementsProfile } from "@/components/achievements/achievements-profile"

export function UserProfileSettings({ highlightQuery = "" }: { highlightQuery?: string }) {
  const {
    userProfile,
    updateUserProfile,
    clearAllData,
    goals,
    transactions,
    budgets,
    debtAccounts
  } = useWalletData()

  const {
    achievements,
    unlockedAchievements,
    lockedAchievements,
    celebration,
    dismissCelebration
  } = useAchievements({
    goals,
    transactions,
    budgets,
    debtAccounts,
    userProfile: userProfile!
  })
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
  const [showWorkDataDialog, setShowWorkDataDialog] = useState(false)

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

  const isTimeWalletEnabled = useMemo(() => {
    return formData.monthlyEarning > 0 && formData.workingHoursPerDay > 0 && formData.workingDaysPerMonth > 0
  }, [formData.monthlyEarning, formData.workingHoursPerDay, formData.workingDaysPerMonth])

  const handleSave = () => {
    updateUserProfile(formData)
    toast({ title: "Profile Updated", description: "Your profile settings have been saved successfully." })
    setEditMode(false)
  }

  const handleTimeWalletToggle = (enabled: boolean) => {
    if (enabled) {
      // Enable: Show dialog to enter work data
      setShowWorkDataDialog(true)
    } else {
      // Disable: Clear work data to empty values
      updateField("monthlyEarning", 0)
      updateField("workingHoursPerDay", 0)
      updateField("workingDaysPerMonth", 0)
      toast({
        title: "Time Wallet Disabled",
        description: "Work data has been cleared and time-based calculations are now disabled.",
      })
    }
  }

  const handleSaveWorkData = () => {
    if (formData.monthlyEarning > 0 && formData.workingHoursPerDay > 0 && formData.workingDaysPerMonth > 0) {
      updateUserProfile(formData)
      setShowWorkDataDialog(false)
      toast({
        title: "Time Wallet Enabled",
        description: "Time-based value calculations are now active.",
      })
    } else {
      toast({
        title: "Invalid Data",
        description: "Please fill in all work information fields.",
        variant: "destructive",
      })
    }
  }
  const handleCancelChanges = () => {
    if (userProfile) {
      // Reset form data to original values
      setFormData({ ...userProfile, customCurrency: userProfile.customCurrency || { code: "", symbol: "", name: "" } })
      setShowCustomCurrency(userProfile.currency === "CUSTOM")
      setAvatarPreview(null)
      setShowAvatarDialog(false)
    }
    toast({ title: "Changes Cancelled", description: "All unsaved changes have been reverted." })
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
            <CardDescription>Switch to edit mode to edit</CardDescription>
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

                {/* Profile Stats - Only show if time wallet is enabled */}
                {isTimeWalletEnabled && (
                  <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-info/5 to-info/10 dark:from-info/20 dark:to-info/30 border border-info/20 dark:border-info/80">
                      <div className="text-xl font-bold text-info">
                        {getCurrentCurrencySymbol}{hourlyRate.toFixed(2)}
                      </div>
                      <div className="text-sm text-info/70">Hourly Rate</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-success/5 to-success/10 dark:from-success/20 dark:to-success/30 border border-success/20 dark:border-success/80">
                      <div className="text-xl font-bold text-success">
                        {formData.workingHoursPerDay}h
                      </div>
                      <div className="text-sm text-success/70">Daily Hours</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-warning/5 to-warning/10 dark:from-warning/20 dark:to-warning/30 border border-warning/20 dark:border-warning/80">
                      <div className="text-xl font-bold text-warning">
                        {formData.workingDaysPerMonth}
                      </div>
                      <div className="text-sm text-warning/70">Work Days</div>
                    </div>
                  </div>
                )}
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
          {/* Time Wallet Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="space-y-1">
              <Label htmlFor="time-wallet-toggle" className="text-sm font-medium">Time Wallet</Label>
              <p className="text-xs text-muted-foreground">
                {isTimeWalletEnabled
                  ? "Time-based value calculations are active"
                  : "Enable time-based value calculations for transactions"
                }
              </p>
            </div>
            <Switch
              id="time-wallet-toggle"
              checked={isTimeWalletEnabled}
              onCheckedChange={handleTimeWalletToggle}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {!editMode ? (
            isTimeWalletEnabled ? (
              <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-success/5 to-success/10 dark:from-success/20 dark:to-success/30 border border-success/20 dark:border-success/80">
                  <div className="text-lg font-bold text-success">
                    {getCurrentCurrencySymbol}{(formData.monthlyEarning || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-success/70">Monthly Earning</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-info/5 to-info/10 dark:from-info/20 dark:to-info/30 border border-info/20 dark:border-info/80">
                  <div className="text-lg font-bold text-info">
                    {formData.workingHoursPerDay}h
                  </div>
                  <div className="text-sm text-info/70">Hours per Day</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-warning/5 to-warning/10 dark:from-warning/20 dark:to-warning/30 border border-warning/20 dark:border-warning/80">
                  <div className="text-lg font-bold text-warning">
                    {formData.workingDaysPerMonth}
                  </div>
                  <div className="text-sm text-warning/70">Days per Month</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Time wallet is disabled. Enable it to view your work information.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly-earning" className="text-sm font-medium">Monthly Earning</Label>
                <Input
                  id="monthly-earning"
                  type="number"
                  placeholder="5000"
                  value={formData.monthlyEarning || ""}
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
                  value={formData.workingHoursPerDay || ""}
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
                  value={formData.workingDaysPerMonth || ""}
                  onChange={(e) => updateField("workingDaysPerMonth", Number(e.target.value))}
                  className="h-11"
                />
              </div>
            </div>
          )}

          {/* Enhanced Preview Card - Only show if time wallet is enabled */}
          {isTimeWalletEnabled && (
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
          )}
        </CardContent>
      </Card>

      {/* Achievements Profile */}
      <Card className="hidden md:block border-0 shadow-sm bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl">Achievements</CardTitle>
              <CardDescription>Track your financial milestones and accomplishments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AchievementsProfile
            achievements={achievements}
            unlockedAchievements={unlockedAchievements}
            lockedAchievements={lockedAchievements}
            celebration={celebration}
            onDismissCelebration={dismissCelebration}
          />
        </CardContent>
      </Card>

      {/* Enhanced Save Changes (only in edit mode and when there are changes) */}
      {editMode && hasChanges && (
        <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg md:max-w-sm border-0 shadow-lg transition-all duration-300 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 shadow-primary/10">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse flex-shrink-0"></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">
                    Unsaved Changes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={handleCancelChanges}
                  variant="outline"
                  size="sm"
                  className="border-muted-foreground/20 hover:bg-muted/50 transition-all duration-200 text-xs px-2 py-1 h-8 min-w-[60px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 text-xs px-2 py-1 h-8 min-w-[80px]"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
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

      {/* Work Data Dialog */}
      <Dialog open={showWorkDataDialog} onOpenChange={setShowWorkDataDialog}>
        <DialogContent className="sm:max-w-lg border-0 shadow-2xl bg-gradient-to-br from-background to-background/95 backdrop-blur-sm">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-xl font-semibold">Enable Time Wallet</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter your work information to enable time-based value calculations for transactions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="dialog-monthly-earning" className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                Monthly Earning
              </Label>
              <Input
                id="dialog-monthly-earning"
                type="number"
                placeholder="Enter amount (e.g., 5000)"
                value={isNaN(formData.monthlyEarning) ? "" : formData.monthlyEarning}
                onChange={(e) => updateField("monthlyEarning", Number(e.target.value) || 0)}
                className="h-12 text-base border-2 focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="dialog-hours-day" className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                Hours per Day
              </Label>
              <Input
                id="dialog-hours-day"
                type="number"
                min="1"
                max="24"
                placeholder="Enter hours (e.g., 8)"
                value={isNaN(formData.workingHoursPerDay) ? "" : formData.workingHoursPerDay}
                onChange={(e) => updateField("workingHoursPerDay", Number(e.target.value) || 0)}
                className="h-12 text-base border-2 focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="dialog-days-month" className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                Days per Month
              </Label>
              <Input
                id="dialog-days-month"
                type="number"
                min="1"
                max="31"
                placeholder="Enter days (e.g., 22)"
                value={isNaN(formData.workingDaysPerMonth) ? "" : formData.workingDaysPerMonth}
                onChange={(e) => updateField("workingDaysPerMonth", Number(e.target.value) || 0)}
                className="h-12 text-base border-2 focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 w-full pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowWorkDataDialog(false)}
              className="flex-1 h-11 border-2 hover:bg-muted/50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWorkData}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Save className="w-4 h-4 mr-2" />
              Enable Time Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
