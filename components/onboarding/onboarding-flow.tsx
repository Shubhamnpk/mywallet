
"use client"

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Clock,
  TrendingUp,
  Shield,
  Lock,
  BarChart3,
  PiggyBank,
  ArrowRight,
  CheckCircle,
  ArrowLeft,
  User,
  DollarSign,
  Calendar,
  Sparkles,
  Camera,
  ImageIcon,
  X
} from 'lucide-react';
import type { UserProfile } from '@/types/wallet';
import { ONBOARDING_CURRENCIES } from '@/lib/currency';
import { SecurePinManager } from '@/lib/secure-pin-manager';
import { SessionManager } from '@/lib/session-manager';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface OnboardingProps {
  onComplete: (userProfile: UserProfile) => void;
}

const steps = [
  {
    id: 0,
    title: "Welcome to MyWallet",
    subtitle: "Your time-aware financial companion",
    icon: Wallet,
    description: "Your time-aware financial companion"
  },
  {
    id: 1,
    title: "Let's Get Personal",
    subtitle: "Your name & profile",
    icon: User,
    description: "Set your name and profile picture"
  },
  {
    id: 2,
    title: "How do you want to use MyWallet?",
    subtitle: "Choose your style",
    icon: Clock,
    description: "Pick the experience that fits you best"
  },
  {
    id: 3,
    title: "How are you paid?",
    subtitle: "Your pay details",
    icon: DollarSign,
    description: "Enter monthly or hourly pay to personalize time-based insights"
  },
  {
    id: 4,
    title: "Tell us about your work schedule",
    subtitle: "Daily and weekly routine",
    icon: Calendar,
    description: "How many hours per day and days per week do you work?"
  },
  {
    id: 5,
    title: "Keep your wallet secure",
    subtitle: "Your privacy matters",
    icon: Shield,
    description: "Add a PIN to protect your financial data"
  },
  {
    id: 6,
    title: "You're all set! 🎉",
    subtitle: "Welcome aboard!",
    icon: Sparkles,
    description: "Ready to take control of your finances"
  }
];

const features = [
  {
    icon: Clock,
    title: 'Time-Aware Spending',
    description: 'See purchases in work hours',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20'
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'AES-256 local encryption',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20'
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'Track patterns & trends',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20'
  },
  {
    icon: PiggyBank,
    title: 'Goal Tracking',
    description: 'Achieve savings milestones',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20'
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    avatar: null as string | null,
    walletType: 'timed' as 'timed' | 'normal',
    payInputMode: 'monthly' as 'monthly' | 'hourly',
    monthlyEarning: '',
    hourlyEarning: '',
    currency: 'NPR',
    workingHoursPerDay: '',
    workingDaysPerWeek: '',
    enableSecurity: true,
    pin: '',
    confirmPin: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const currentStep = steps.find(s => s.id === step) || steps[0];
  const maxStep = formData.enableSecurity ? 6 : 5;

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('Please enter your name');
          return false;
        }
        break;
      case 2:
        break;
      case 3:
        if (formData.payInputMode === 'monthly') {
          const monthly = parseFloat(formData.monthlyEarning);
          if (!Number.isFinite(monthly) || monthly <= 0) {
            toast.error('Please enter a valid monthly earning');
            return false;
          }
        } else {
          const hourly = parseFloat(formData.hourlyEarning);
          if (!Number.isFinite(hourly) || hourly <= 0) {
            toast.error('Please enter a valid hourly earning');
            return false;
          }
        }
        break;
      case 4:
        const hours = parseFloat(formData.workingHoursPerDay);
        const daysPerWeek = parseFloat(formData.workingDaysPerWeek);
        if (
          !Number.isFinite(hours) ||
          hours <= 0 ||
          hours > 24 ||
          !Number.isFinite(daysPerWeek) ||
          daysPerWeek <= 0 ||
          daysPerWeek > 7
        ) {
          toast.error('Please enter valid working hours and days per week');
          return false;
        }
        break;
      case 5:
        if (formData.enableSecurity) {
          if (formData.pin.length !== 6) {
            toast.error('Please enter a 6-digit PIN');
            return false;
          }
          if (formData.pin !== formData.confirmPin) {
            toast.error('PINs do not match');
            return false;
          }
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (formData.walletType === 'normal') {
      // Skip Earnings and Schedule for normal wallet
      if (step === 2) {
        setStep(5); // Skip to Security
      } else if (step === 5 && !formData.enableSecurity) {
        setStep(6); // Skip to Complete
      } else {
        setStep(Math.min(step + 1, maxStep));
      }
    } else {
      // For timed wallet, proceed normally
      if (step === 5 && !formData.enableSecurity) {
        setStep(6); // Skip to Complete
      } else {
        setStep(Math.min(step + 1, maxStep));
      }
    }
  };

  const handleBack = () => {
    if (formData.walletType === 'normal') {
      if (step === 5) {
        setStep(2);
      } else {
        setStep(Math.max(step - 1, 0));
      }
    } else {
      if (step === 6 && !formData.enableSecurity) {
        setStep(5); // Back to Security
      } else {
        setStep(Math.max(step - 1, 0));
      }
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file.')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Please select an image smaller than 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setFormData({ ...formData, avatar: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleCameraCapture = () => {
    if (cameraInputRef.current) cameraInputRef.current.click()
  }

  const handleRemoveAvatar = () => {
    setFormData({ ...formData, avatar: null })
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

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      // Set up PIN if security is enabled
      if (formData.enableSecurity && formData.pin) {
        const pinSetupSuccess = await SecurePinManager.setupPin(formData.pin);
        if (!pinSetupSuccess) {
          toast.error('Failed to set up PIN. Please try again.');
          return;
        }

        // Create initial session after PIN setup for consistent behavior
        SessionManager.createSession();
      }

      // Get PIN data from localStorage if security is enabled
      let pinData = {};
      if (formData.enableSecurity && formData.pin) {
        const pinHash = localStorage.getItem('wallet_pin_hash');
        const pinSalt = localStorage.getItem('wallet_pin_salt');
        if (pinHash && pinSalt) {
          pinData = {
            pin: pinHash,
            pinSalt: pinSalt
          };
        }
      }

      const parsedHoursPerDay = parseFloat(formData.workingHoursPerDay) || 0;
      const parsedDaysPerWeek = parseFloat(formData.workingDaysPerWeek) || 0;
      const parsedDaysPerMonth = parsedDaysPerWeek > 0 ? parsedDaysPerWeek * 4.333 : 0;
      const parsedHourly = parseFloat(formData.hourlyEarning) || 0;
      const parsedMonthly = parseFloat(formData.monthlyEarning) || 0;
      const resolvedMonthly = formData.payInputMode === 'hourly'
        ? parsedHourly * parsedHoursPerDay * parsedDaysPerMonth
        : parsedMonthly;
      const resolvedHourly = formData.payInputMode === 'hourly'
        ? parsedHourly
        : (parsedHoursPerDay > 0 && parsedDaysPerMonth > 0 ? resolvedMonthly / (parsedHoursPerDay * parsedDaysPerMonth) : 0);

      const userProfile: UserProfile = {
        name: formData.name.trim(),
        monthlyEarning: resolvedMonthly,
        currency: formData.currency,
        workingHoursPerDay: parsedHoursPerDay,
        workingDaysPerMonth: parsedDaysPerMonth,
        createdAt: new Date().toISOString(),
        hourlyRate: resolvedHourly,
        securityEnabled: formData.enableSecurity,
        avatar: formData.avatar || undefined,
        ...pinData
      };

      onComplete(userProfile);
      toast.success(`Welcome, ${userProfile.name}! Your financial journey begins now.`);
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    const defaultProfile: UserProfile = {
      name: 'Guest User',
      monthlyEarning: 0,
      currency: 'NPR',
      workingHoursPerDay: 8,
      workingDaysPerMonth: 22,
      createdAt: new Date().toISOString(),
      hourlyRate: 0,
      securityEnabled: false,
    };
    onComplete(defaultProfile);
    toast.info("Welcome! You can complete your profile later in Settings.");
  };

  const parsedHoursPerDay = parseFloat(formData.workingHoursPerDay) || 0;
  const parsedDaysPerWeek = parseFloat(formData.workingDaysPerWeek) || 0;
  const parsedDaysPerMonth = parsedDaysPerWeek > 0 ? parsedDaysPerWeek * 4.333 : 0;
  const parsedMonthly = parseFloat(formData.monthlyEarning) || 0;
  const parsedHourly = parseFloat(formData.hourlyEarning) || 0;
  const derivedHourlyRate = parsedMonthly > 0 && parsedHoursPerDay > 0 && parsedDaysPerMonth > 0
    ? parsedMonthly / (parsedHoursPerDay * parsedDaysPerMonth)
    : 0;
  const resolvedHourlyRate = formData.payInputMode === 'hourly' ? parsedHourly : derivedHourlyRate;
  const resolvedMonthlyEarning = formData.payInputMode === 'hourly'
    ? parsedHourly * parsedHoursPerDay * parsedDaysPerMonth
    : parsedMonthly;
  const hourlyRate = resolvedHourlyRate.toFixed(2);

  const progress = (step / maxStep) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-3">
      <div className="w-full max-w-md">

        {/* Main Card */}
        <Card className="border-0 shadow-xl bg-card/600 backdrop-blur-sm border border-border/60 relative overflow-hidden">
          <CardHeader className="text-center pb-3">
            {step === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 top-2 text-muted-foreground hover:text-foreground z-10"
                onClick={() => router.push('/welcome')}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {step < maxStep && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground z-10"
                onClick={handleSkip}
                disabled={isLoading}
              >
                Skip
              </Button>
            )}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-xl flex items-center justify-center shadow-lg">
                <currentStep.icon className="w-8 h-8 text-primary drop-shadow-sm" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">
              {currentStep.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {currentStep.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Step 0 - Welcome Screen */}
            {step === 0 && (
              <div className="space-y-6 text-center">
                {/* Hero Section */}
                <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto mt-3" />


                {/* Journey Message */}
                <div className="space-y-4">
                  <div className="relative">
                    <p className="text-base text-foreground/90 font-medium leading-relaxed">
                      Let's start your journey to
                    </p>
                    <p className="text-lg font-bold bg-gradient-to-r from-primary via-primary/80 to-primary text-transparent bg-clip-text">
                      financial freedom
                    </p>
                  </div>

                  {/* Feature Showcase */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {features.map((feature, index) => (
                      <div key={index} className="group relative p-3 rounded-lg bg-card/50 border border-border/30 backdrop-blur-md hover:bg-card/70 hover:border-border/50 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative z-10">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${feature.bgColor} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                            <feature.icon className={`w-4 h-4 ${feature.color}`} />
                          </div>
                          <h3 className="font-semibold text-xs text-foreground group-hover:text-foreground/95 transition-colors">
                            {feature.title}
                          </h3>
                          <p className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors leading-tight">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 - Profile Setup */}
            {step === 1 && (
              <div className="space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    {/* Hidden file inputs */}
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

                    {/* Avatar with hover overlay */}
                    <div
                      className="relative cursor-pointer"
                      onClick={() => !formData.avatar && handleFileUpload()}
                    >
                      <Avatar className="w-24 h-24 ring-2 ring-primary/20 shadow-md transition-all duration-300 group-hover:ring-primary/40 group-hover:shadow-lg">
                        <AvatarImage
                          src={formData.avatar || undefined}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/10 text-primary font-bold text-2xl">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Hover overlay with options */}
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex gap-1">
                          {!formData.avatar ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileUpload();
                                }}
                                className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors shadow-sm"
                                title="Upload from gallery"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCameraCapture();
                                }}
                                className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors shadow-sm"
                                title="Take photo"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAvatar();
                              }}
                              className="w-8 h-8 bg-red-500/90 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-sm"
                              title="Remove avatar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">
                      {formData.avatar
                        ? "✨ Profile picture set! Hover to change"
                        : "📸 Add a profile picture (optional)"
                      }
                    </p>
                    {!formData.avatar && (
                      <p className="text-xs text-muted-foreground/80">
                        Or continue with beautiful auto-generated initials
                      </p>
                    )}
                  </div>
                </div>
                {/* Name Input Section */}
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-foreground/90">What should we call you?</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 text-base border-2 border-border/50 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Step 2 - Wallet Type */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-foreground/90">Choose your wallet type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, walletType: 'timed' })}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 text-center ${formData.walletType === 'timed'
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border/20 bg-background-secondary hover:border-primary/50 hover:bg-primary/5'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${formData.walletType === 'timed' ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}>
                          {formData.walletType === 'timed' && <div className="w-2 h-2 bg-primary-foreground rounded-full mx-auto mt-0.5" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Timed Wallet</h3>
                          <p className="text-xs text-muted-foreground">See how much your purchases cost in work hours</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, walletType: 'normal' })}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 text-center ${formData.walletType === 'normal'
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border/20 bg-background-secondary hover:border-primary/50 hover:bg-primary/5'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${formData.walletType === 'normal' ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}>
                          {formData.walletType === 'normal' && <div className="w-2 h-2 bg-primary-foreground rounded-full mx-auto mt-0.5" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Normal Wallet</h3>
                          <p className="text-xs text-muted-foreground">Standard wallet without time tracking features</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 - Earnings */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">How do you want to enter your pay?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payInputMode: 'monthly' })}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${formData.payInputMode === 'monthly'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 bg-background-secondary text-foreground/80'
                        }`}
                    >
                      Monthly pay
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payInputMode: 'hourly' })}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${formData.payInputMode === 'hourly'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 bg-background-secondary text-foreground/80'
                        }`}
                    >
                      Hourly pay
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {formData.payInputMode === 'hourly' ? 'Hourly Income' : 'Monthly Income'}
                    </Label>
                    <div className="flex gap-2">
                      <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                        <SelectTrigger className="w-20 h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ONBOARDING_CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="5000"
                        value={formData.payInputMode === 'hourly' ? formData.hourlyEarning : formData.monthlyEarning}
                        onChange={(e) => setFormData({
                          ...formData,
                          ...(formData.payInputMode === 'hourly'
                            ? { hourlyEarning: e.target.value }
                            : { monthlyEarning: e.target.value })
                        })}
                        className="flex-1 h-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.payInputMode === 'hourly'
                        ? 'Enter your pay per hour. Monthly earnings will be estimated from your schedule.'
                        : 'Enter your monthly income. Hourly rate will be derived from your schedule.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 - Schedule */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tell us your daily and weekly work schedule for better pay calculations
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">How many hours do you work per day?</Label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      placeholder="e.g., 8"
                      value={formData.workingHoursPerDay}
                      onChange={(e) => setFormData({ ...formData, workingHoursPerDay: e.target.value })}
                      className="h-12 text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Typical work hours per day (e.g., 8 for full-time)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">How many days do you work per week?</Label>
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      placeholder="e.g., 5"
                      value={formData.workingDaysPerWeek}
                      onChange={(e) => setFormData({ ...formData, workingDaysPerWeek: e.target.value })}
                      className="h-12 text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Working days in a typical week (e.g., 5 excluding weekends)
                    </p>
                  </div>
                </div>

                {(formData.workingHoursPerDay && formData.workingDaysPerWeek) && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="text-center space-y-2">
                      <div className="text-lg font-bold text-primary">
                        Your hourly rate: {formData.currency} {hourlyRate}/hr
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Based on {(parsedHoursPerDay * parsedDaysPerMonth).toFixed(1)} working hours per month
                      </div>
                      <div className="text-xs text-muted-foreground/80">
                        Estimated monthly income: {formData.currency} {resolvedMonthlyEarning.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5 - Security */}
            {step === 5 && (
              <div className="space-y-4">

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">PIN Protection</p>
                        <p className="text-xs text-muted-foreground">Secure your wallet</p>
                      </div>
                    </div>
                    <Checkbox
                      id="enable-security"
                      checked={formData.enableSecurity}
                      onCheckedChange={(checked) => setFormData({ ...formData, enableSecurity: !!checked })}
                    />
                  </div>

                  {formData.enableSecurity && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Create PIN (6 digits)</Label>
                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={formData.pin}
                            onChange={(value) => setFormData({ ...formData, pin: value })}
                          >
                            <InputOTPGroup className="gap-1">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <InputOTPSlot key={i} index={i} className="w-10 h-10 text-sm" />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Confirm PIN</Label>
                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={formData.confirmPin}
                            onChange={(value) => setFormData({ ...formData, confirmPin: value })}
                          >
                            <InputOTPGroup className="gap-1">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <InputOTPSlot key={i} index={i} className="w-10 h-10 text-sm" />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      {formData.pin && formData.confirmPin && formData.pin !== formData.confirmPin && (
                        <p className="text-sm text-destructive text-center">PINs do not match</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6 - Perfect! */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {features.map((feature, index) => (
                    <div key={index} className="p-3 rounded-lg bg-background-secondary border">
                      <feature.icon className={`w-5 h-5 ${feature.color} mb-2`} />
                      <h3 className="font-semibold text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary">
                      Welcome, {formData.name}! 👋
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your hourly rate: {formData.currency} {hourlyRate}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 h-10"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {step < maxStep ? (
                <Button
                  onClick={handleNext}
                  className="flex-1 h-10 bg-primary hover:bg-primary-light"
                  disabled={isLoading}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  className="flex-1 h-10 bg-primary hover:bg-primary-light"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Setting up...' : 'Start Journey'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step Indicators */}
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            {Array.from({ length: maxStep + 1 }).map((_, i) => {
              const stepNum = i;
              const isActive = stepNum === step;
              const isCompleted = stepNum < step;

              return (
                <div
                  key={stepNum}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive
                    ? 'bg-primary scale-125'
                    : isCompleted
                      ? 'bg-primary/70'
                      : 'bg-muted-foreground/30'
                    }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
