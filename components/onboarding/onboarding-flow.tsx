
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
import {
  Wallet,
  Clock,
  TrendingUp,
  Target,
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
import { ONBOARDING_EXPENSE_CATEGORIES } from '@/lib/categories';
import { SecurePinManager } from '@/lib/secure-pin-manager';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface OnboardingProps {
  onComplete: (userProfile: UserProfile) => void;
}

const steps = [
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
    subtitle: "Protect your data",
    icon: Shield,
    description: "Keep your information safe"
  },
  {
    id: 6,
    title: "Complete",
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

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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
        // Profile picture step - no validation required
        break;
      case 3:
        if (!formData.monthlyEarning || parseFloat(formData.monthlyEarning) <= 0) {
          toast.error('Please enter a valid monthly earning');
          return false;
        }
        break;
      case 4:
        const hours = parseFloat(formData.workingHoursPerDay);
        const days = parseFloat(formData.workingDaysPerMonth);
        if (hours <= 0 || hours > 24 || days <= 0 || days > 31) {
          toast.error('Please enter valid working hours and days');
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
      setStep(Math.max(step - 1, 1));
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
        hourlyRate: 0,
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

  const hourlyRate = formData.monthlyEarning && formData.workingHoursPerDay && formData.workingDaysPerMonth
    ? (parseFloat(formData.monthlyEarning) / (parseFloat(formData.workingHoursPerDay) * parseFloat(formData.workingDaysPerMonth))).toFixed(2)
    : '0.00';

  const progress = (step / maxStep) * 100;

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-3">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-3 shadow-lg">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold  mb-1">
            MyWallet
          </h1>
          <p className=" text-sm">Your time-aware financial companion</p>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-xl glass border-white/20">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-xl font-bold">
              {currentStep.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {currentStep.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
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
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Your Privacy First</h3>
                    <p className="text-sm text-muted-foreground">
                      AES-256 encryption, stored locally
                    </p>
                  </div>
                </div>

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
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Perfect! 🎉</h3>
                    <p className="text-muted-foreground text-sm">
                      Ready to start your financial journey
                    </p>
                  </div>
                </div>

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
              {step > 1 && (
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
            {Array.from({ length: maxStep }).map((_, i) => {
              const stepNum = i + 1;
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
      </div>
    </div>
  );
}