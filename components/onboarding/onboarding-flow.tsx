"use client"

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
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
  X,
  Cloud,
  Loader2
} from 'lucide-react';
import type { UserProfile } from '@/types/wallet';
import { ONBOARDING_CURRENCIES } from '@/lib/currency';
import { SecurePinManager } from '@/lib/secure-pin-manager';
import { SessionManager } from '@/lib/session-manager';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useConvexAuth } from '@/hooks/use-convex-auth';
import { useConvexSync } from '@/hooks/use-convex-sync';
import { ConvexAuthModal } from '@/components/auth/convex-auth-modal';

// Security and validation constants
const SECURITY_CONSTANTS = {
  MAX_NAME_LENGTH: 50,
  MAX_MONTHLY_EARNING: 999999999.99,
  MIN_MONTHLY_EARNING: 0.01,
  MAX_WORKING_HOURS: 24,
  MIN_WORKING_HOURS: 0.5,
  MAX_WORKING_DAYS: 31,
  MIN_WORKING_DAYS: 1,
  PIN_LENGTH: 6,
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
} as const

// Input validation helpers
const validateName = (name: string): boolean => {
  return typeof name === 'string' &&
         name.trim().length > 0 &&
         name.trim().length <= SECURITY_CONSTANTS.MAX_NAME_LENGTH &&
         !/<script/i.test(name) // Basic XSS prevention
}

const validateMonthlyEarning = (earning: string | number): boolean => {
  const num = typeof earning === 'string' ? parseFloat(earning) : earning
  return !isNaN(num) &&
         isFinite(num) &&
         num >= SECURITY_CONSTANTS.MIN_MONTHLY_EARNING &&
         num <= SECURITY_CONSTANTS.MAX_MONTHLY_EARNING
}

const validateWorkingHours = (hours: string | number): boolean => {
  const num = typeof hours === 'string' ? parseFloat(hours) : hours
  return !isNaN(num) &&
         isFinite(num) &&
         num >= SECURITY_CONSTANTS.MIN_WORKING_HOURS &&
         num <= SECURITY_CONSTANTS.MAX_WORKING_HOURS
}

const validateWorkingDays = (days: string | number): boolean => {
  const num = typeof days === 'string' ? parseFloat(days) : days
  return !isNaN(num) &&
         isFinite(num) &&
         num >= SECURITY_CONSTANTS.MIN_WORKING_DAYS &&
         num <= SECURITY_CONSTANTS.MAX_WORKING_DAYS
}

const validatePin = (pin: string): boolean => {
  return typeof pin === 'string' &&
         pin.length === SECURITY_CONSTANTS.PIN_LENGTH &&
         /^\d{6}$/.test(pin)
}

const validateAvatarFile = (file: File): boolean => {
  return file.type.startsWith('image/') &&
         file.size <= SECURITY_CONSTANTS.MAX_AVATAR_SIZE
}

const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>'"&]/g, '').trim()
}

// Safe calculation helpers
const safeParseFloat = (value: any, fallback: number = 0): number => {
  const parsed = parseFloat(value)
  return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed
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
    title: "Welcome",
    subtitle: "Let's get started",
    icon: User,
    description: "Tell us about yourself"
  },
  {
    id: 2,
    title: "Profile Picture",
    subtitle: "Personalize your account",
    icon: User,
    description: "Add a profile picture or use your initials"
  },
  {
    id: 3,
    title: "Earnings",
    subtitle: "Your income details",
    icon: DollarSign,
    description: "Help us calculate your time value"
  },
  {
    id: 4,
    title: "Schedule",
    subtitle: "Work preferences",
    icon: Calendar,
    description: "Fine-tune your working hours"
  },
  {
    id: 5,
    title: "Security",
    subtitle: "Your Privacy First",
    icon: Shield,
    description: "AES-256 encryption, stored locally"
  },
  {
    id: 6,
    title: "Perfect! 🎉",
    subtitle: "You're all set!",
    icon: Sparkles,
    description: "Ready to start your journey"
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

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, signUp, signIn, isLoading: authLoading } = useConvexAuth()
  const { syncFromConvex } = useConvexSync()
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showConvexLogin, setShowConvexLogin] = useState(false);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [dataRestored, setDataRestored] = useState(false);

  // Ref to prevent multiple Convex sync attempts
  const skipConvexSkipRef = useRef(false);

  const [formData, setFormData] = useState({
    name: '',
    avatar: null as string | null,
    monthlyEarning: '',
    currency: 'NPR',
    workingHoursPerDay: '8',
    workingDaysPerMonth: '20',
    enableSecurity: true,
    pin: '',
    confirmPin: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Memoized calculations for performance
  const currentStep = useMemo(() => steps.find(s => s.id === step) || steps[0], [step])
  const maxStep = useMemo(() => formData.enableSecurity ? 6 : 5, [formData.enableSecurity])
  const hourlyRate = useMemo(() => {
    if (!formData.monthlyEarning || !formData.workingHoursPerDay || !formData.workingDaysPerMonth) {
      return '0.00'
    }
    const rate = safeParseFloat(formData.monthlyEarning) /
                (safeParseFloat(formData.workingHoursPerDay) * safeParseFloat(formData.workingDaysPerMonth))
    return rate.toFixed(2)
  }, [formData.monthlyEarning, formData.workingHoursPerDay, formData.workingDaysPerMonth])

  // Handle Convex authentication - don't sync or redirect during onboarding
  React.useEffect(() => {
    if (!isAuthenticated || !user || skipConvexSkipRef.current) return;

    // Always prevent sync and redirect during onboarding phase
    // User should complete onboarding first before any sync operations
    console.log('[Onboarding] User authenticated with Convex - allowing onboarding completion first');
    skipConvexSkipRef.current = true;

    // Don't perform any sync operations during onboarding
    // The user will be able to sync after completing onboarding
  }, [isAuthenticated, user])

  // Enhanced validation with proper error handling
  const validateStep = useCallback(() => {
    try {
      switch (step) {
        case 1:
          if (!validateName(formData.name)) {
            toast.error('Please enter a valid name (1-50 characters)');
            return false;
          }
          break;
        case 2:
          // Profile picture step - no validation required
          break;
        case 3:
          if (!validateMonthlyEarning(formData.monthlyEarning)) {
            toast.error(`Please enter a valid monthly earning (${SECURITY_CONSTANTS.MIN_MONTHLY_EARNING.toFixed(2)} - ${SECURITY_CONSTANTS.MAX_MONTHLY_EARNING.toFixed(2)})`);
            return false;
          }
          break;
        case 4:
          if (!validateWorkingHours(formData.workingHoursPerDay)) {
            toast.error(`Please enter valid working hours per day (${SECURITY_CONSTANTS.MIN_WORKING_HOURS} - ${SECURITY_CONSTANTS.MAX_WORKING_HOURS})`);
            return false;
          }
          if (!validateWorkingDays(formData.workingDaysPerMonth)) {
            toast.error(`Please enter valid working days per month (${SECURITY_CONSTANTS.MIN_WORKING_DAYS} - ${SECURITY_CONSTANTS.MAX_WORKING_DAYS})`);
            return false;
          }
          break;
        case 5:
          if (formData.enableSecurity) {
            if (!validatePin(formData.pin)) {
              toast.error(`Please enter a valid 6-digit PIN`);
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
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Validation failed. Please check your input.');
      return false;
    }
  }, [step, formData]);

  const handleNext = () => {
    if (!validateStep()) return;

    if (step === 4 && !formData.enableSecurity) {
      setStep(6); // Skip PIN setup
    } else {
      setStep(Math.min(step + 1, maxStep));
    }
  };

  const handleBack = () => {
    if (step === 6 && !formData.enableSecurity) {
      setStep(4); // Skip PIN setup
    } else {
      setStep(Math.max(step - 1, 0));
    }
  };

  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Validate file using our helper
      if (!validateAvatarFile(file)) {
        toast.error(`Please select a valid image file smaller than ${(SECURITY_CONSTANTS.MAX_AVATAR_SIZE / (1024 * 1024)).toFixed(0)}MB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          setFormData(prev => ({ ...prev, avatar: result }))
        }
      }
      reader.onerror = () => {
        toast.error('Failed to read image file. Please try again.')
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Image selection error:', error)
      toast.error('Failed to process image. Please try again.')
    }
  }, [])

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
      // Handle security setup based on user choice
      if (formData.enableSecurity && formData.pin) {
        // Set up PIN if security is enabled
        const pinSetupSuccess = await SecurePinManager.setupPin(formData.pin);
        if (!pinSetupSuccess) {
          toast.error('Failed to set up PIN. Please try again.');
          return;
        }

        // Create initial session after PIN setup for consistent behavior
        SessionManager.createSession();
      } else if (!formData.enableSecurity) {
        // If security is disabled, ensure no PIN data exists and clear any previous security data
        SecurePinManager.clearAllSecurityData();
        console.log('[Onboarding] Security disabled - cleared all security data');
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

      const userProfile: UserProfile = {
        name: formData.name.trim(),
        monthlyEarning: parseFloat(formData.monthlyEarning),
        currency: formData.currency,
        workingHoursPerDay: parseFloat(formData.workingHoursPerDay),
        workingDaysPerMonth: parseFloat(formData.workingDaysPerMonth),
        createdAt: new Date().toISOString(),
        hourlyRate: parseFloat(hourlyRate), // Use the calculated hourly rate
        securityEnabled: formData.enableSecurity,
        avatar: formData.avatar || undefined,
        ...pinData
      };

      // Save to localStorage
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      localStorage.setItem('isFirstTime', 'false');

      toast.success(`Welcome, ${userProfile.name}! Your financial journey begins now.`);

      // Small delay to show success message, then redirect
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (step / maxStep) * 100;

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-3">
      <div className="w-full max-w-md">

        {/* Main Card */}
        <Card className="border-0 shadow-xl glass border-white/20">
          <CardHeader className="text-center pb-3">
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
                    <p className="text-base text-white/95 font-medium leading-relaxed">
                      Let's start your journey to
                    </p>
                    <p className="text-lg font-bold bg-gradient-to-r from-primary via-primary/80 to-primary text-transparent bg-clip-text">
                      financial freedom
                    </p>
                  </div>

                  {/* Feature Showcase */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {features.map((feature, index) => (
                      <div key={index} className="group relative p-3 rounded-lg bg-gradient-to-br from-white/15 to-white/5 border border-white/10 backdrop-blur-md hover:from-white/20 hover:to-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative z-10">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${feature.bgColor} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                            <feature.icon className={`w-4 h-4 ${feature.color}`} />
                          </div>
                          <h3 className="font-semibold text-xs text-white group-hover:text-white/95 transition-colors">
                            {feature.title}
                          </h3>
                          <p className="text-xs text-white/70 group-hover:text-white/80 transition-colors leading-tight">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Convex Login Option */}
                  <div className="mt-6 pt-4 border-t border-white/20">
                    <p className="text-xs text-white/80 mb-3 text-center">
                      Already have a Convex account?
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowConvexLogin(true)}
                      className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-300"
                      disabled={authLoading || isRestoringData}
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      {authLoading ? 'Connecting...' : isRestoringData ? 'Restoring Data...' : 'Sign in with Convex'}
                    </Button>
                    {isAuthenticated && !isRestoringData && (
                      <p className="text-xs text-green-300 mt-2 text-center">
                        ✅ Connected as {user?.email}
                      </p>
                    )}
                    {isRestoringData && (
                      <div className="mt-3 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                        <div className="flex items-center justify-center gap-2 text-blue-200">
                          <div className="w-4 h-4 border-2 border-blue-200/30 border-t-blue-200 rounded-full animate-spin" />
                          <span className="text-sm font-medium">Restoring your wallet data...</span>
                        </div>
                        <p className="text-xs text-blue-300/80 mt-1 text-center">
                          This may take a few seconds
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 - Welcome */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">What should we call you?</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {features.slice(0, 2).map((feature, index) => (
                    <div key={index} className="p-3 rounded-lg bg-background-secondary border">
                      <feature.icon className={`w-5 h-5 ${feature.color} mb-2`} />
                      <h3 className="font-semibold text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 - Profile Picture */}
            {step === 2 && (
              <div className="space-y-6">

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
                      <Avatar className="w-32 h-32 ring-4 ring-background shadow-lg transition-all duration-300 group-hover:ring-primary/20 group-hover:shadow-xl">
                        <AvatarImage
                          src={formData.avatar || undefined}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-bold text-3xl">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Hover overlay with options */}
                      <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex gap-2">
                          {!formData.avatar ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileUpload();
                                }}
                                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                title="Upload from gallery"
                              >
                                <ImageIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCameraCapture();
                                }}
                                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                title="Take photo"
                              >
                                <Camera className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAvatar();
                              }}
                              className="w-10 h-10 bg-destructive/80 rounded-full flex items-center justify-center text-white hover:bg-destructive transition-colors"
                              title="Remove avatar"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {formData.avatar
                        ? "✨ Profile picture uploaded! Hover to remove"
                        : "📸 Click the avatar or hover for options"
                      }
                    </p>
                    {!formData.avatar && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Or continue with beautiful auto-generated initials
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 - Earnings */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Monthly Income</Label>
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
                        value={formData.monthlyEarning}
                        onChange={(e) => setFormData({ ...formData, monthlyEarning: e.target.value })}
                        className="flex-1 h-10"
                      />
                    </div>
                  </div>

                  {formData.monthlyEarning && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 text-primary">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium text-sm">Hourly rate: {formData.currency} {hourlyRate}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4 - Schedule */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Hours/day</Label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={formData.workingHoursPerDay}
                      onChange={(e) => setFormData({ ...formData, workingHoursPerDay: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Days/month</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.workingDaysPerMonth}
                      onChange={(e) => setFormData({ ...formData, workingDaysPerMonth: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">
                      {formData.currency} {hourlyRate}/hr
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {parseFloat(formData.workingHoursPerDay) * parseFloat(formData.workingDaysPerMonth)} hours/month
                    </div>
                  </div>
                </div>
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

            {/* Step 6 - Complete */}
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
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-white scale-125'
                      : isCompleted
                        ? 'bg-white'
                        : 'bg-white/30'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Convex Auth Modal */}
        <ConvexAuthModal
          open={showConvexLogin}
          onOpenChange={setShowConvexLogin}
          onAuthSuccess={() => {
            // Redirect to dashboard immediately when authentication succeeds
            router.push('/')
          }}
          signUp={signUp}
          signIn={signIn}
          isLoading={authLoading}
          title="Welcome Back to MyWallet"
          description="Sign in to sync your wallet data across all your devices"
          initialMode="signin"
        />
      </div>
    </div>
  );
}
