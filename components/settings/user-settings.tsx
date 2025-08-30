"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useWalletData } from "@/contexts/wallet-data-context"
import { LogOut, Trash2, Upload, Save, Plus, PencilLine } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const currencies = [
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "GBP", label: "British Pound (£)", symbol: "£" },
  { value: "JPY", label: "Japanese Yen (¥)", symbol: "¥" },
  { value: "CAD", label: "Canadian Dollar (C$)", symbol: "C$" },
  { value: "AUD", label: "Australian Dollar (A$)", symbol: "A$" },
  { value: "INR", label: "Indian Rupee (₹)", symbol: "₹" },
  { value: "CUSTOM", label: "Custom Currency", symbol: "" },
]

export function UserProfileSettings() {
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

  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (formData?.currency === "CUSTOM") return formData?.customCurrency?.symbol || ""
    return (currencies.find((c) => c.value === formData?.currency)?.symbol as string) || "$"
  }, [formData?.currency, formData?.customCurrency])

  const hourlyRate = useMemo(() => {
    const hours = formData.workingHoursPerDay * formData.workingDaysPerMonth
    return hours > 0 ? formData.monthlyEarning / hours : 0
  }, [formData.monthlyEarning, formData.workingHoursPerDay, formData.workingDaysPerMonth])

  const perMinuteRate = useMemo(() => (hourlyRate > 0 ? hourlyRate / 60 : 0), [hourlyRate])

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

        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="w-24 h-24">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>
                {formData.name
                  ? formData.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                  : "U"}
              </AvatarFallback>
            </Avatar>
            {editMode && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" aria-label="Upload avatar image" />
                <Button variant="outline" size="sm" onClick={handleFileUpload}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </>
            )}
          </div>

          {/* Info */}
          <div className="md:col-span-2 space-y-4">
            {!editMode ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold">{formData.name || "Unnamed User"}</p>
                <p className="text-sm text-muted-foreground">
                  Currency:{" "}
                  {formData.currency === "CUSTOM"
                    ? `${formData.customCurrency.name} (${formData.customCurrency.symbol})`
                    : currencies.find((c) => c.value === formData.currency)?.label}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                    />
                  </div>
                  <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showCustomCurrency && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="custom-code">Code</Label>
                      <Input
                        id="custom-code"
                        placeholder="Code (BTC)"
                        value={formData.customCurrency?.code || ""}
                        onChange={(e) =>
                          updateField("customCurrency", {
                            ...formData.customCurrency,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom-symbol">Symbol</Label>
                      <Input
                        id="custom-symbol"
                        placeholder="Symbol (₿)"
                        value={formData.customCurrency?.symbol || ""}
                        onChange={(e) =>
                          updateField("customCurrency", {
                            ...formData.customCurrency,
                            symbol: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom-name">Name</Label>
                      <Input
                        id="custom-name"
                        placeholder="Name (Bitcoin)"
                        value={formData.customCurrency?.name || ""}
                        onChange={(e) =>
                          updateField("customCurrency", {
                            ...formData.customCurrency,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work Information */}
      <Card>
        <CardHeader>
          <CardTitle>Work Information</CardTitle>
          <CardDescription>Helps calculate your time value for transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editMode ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <p>Monthly Earning: {getCurrentCurrencySymbol}{formData.monthlyEarning}</p>
              <p>Hours / Day: {formData.workingHoursPerDay}</p>
              <p>Days / Month: {formData.workingDaysPerMonth}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="number"
                placeholder="Monthly Earning"
                value={formData.monthlyEarning}
                onChange={(e) => updateField("monthlyEarning", Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Hours / Day"
                value={formData.workingHoursPerDay}
                onChange={(e) => updateField("workingHoursPerDay", Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Days / Month"
                value={formData.workingDaysPerMonth}
                onChange={(e) => updateField("workingDaysPerMonth", Number(e.target.value))}
              />
            </div>
          )}

          {/* Preview */}
          <div className="p-4 bg-muted rounded-lg space-y-1">
            <p className="text-sm text-muted-foreground">Time Calculation Preview:</p>
            <p className="text-sm">
              Hourly Rate: <span className="font-medium">{getCurrentCurrencySymbol} {hourlyRate.toFixed(2)}</span>
            </p>
            <p className="text-sm">
              Per Minute: <span className="font-medium">{getCurrentCurrencySymbol} {perMinuteRate.toFixed(2)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes (only in edit mode) */}
      {editMode && (
        <Card className={hasChanges ? "border-primary shadow-md" : "border-muted"}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {hasChanges ? "You have unsaved changes" : "No changes to save"}
              </p>
              <Button onClick={handleSave} disabled={!hasChanges}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
