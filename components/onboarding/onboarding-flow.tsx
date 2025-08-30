"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Wallet, Clock, TrendingUp, Target } from 'lucide-react';
import type { UserProfile } from '@/types/wallet';

interface OnboardingProps {
  onComplete: (userProfile: UserProfile) => void;
}

const currencies = [
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'CAD', label: '$ CAD' },
  { value: 'AUD', label: '$ AUD' },
];

const features = [
  { icon: Clock, title: 'Time-Based Spending', description: 'See how much work time each expense represents' },
  { icon: TrendingUp, title: 'Smart Analytics', description: 'Track your financial patterns and trends' },
  { icon: Target, title: 'Goal Setting', description: 'Set and achieve your financial goals' },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    monthlyEarning: '',
    currency: 'USD',
    workingHoursPerDay: '8',
    workingDaysPerMonth: '20',
  });

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (step === 2 && (!formData.monthlyEarning || parseFloat(formData.monthlyEarning) <= 0)) {
      toast.error('Please enter a valid monthly earning');
      return;
    }
    setStep(step + 1);
  };

  const handleComplete = () => {
    const userProfile: UserProfile = {
      name: formData.name.trim(),
      monthlyEarning: parseFloat(formData.monthlyEarning),
      currency: formData.currency,
      workingHoursPerDay: parseFloat(formData.workingHoursPerDay),
      workingDaysPerMonth: parseFloat(formData.workingDaysPerMonth),
      createdAt: new Date().toISOString(),
    };

    onComplete(userProfile);
    toast.success(`Welcome, ${userProfile.name}! Let's track your wallet wisely.`);
  };

  const hourlyRate = formData.monthlyEarning && formData.workingHoursPerDay && formData.workingDaysPerMonth
    ? (parseFloat(formData.monthlyEarning) / (parseFloat(formData.workingHoursPerDay) * parseFloat(formData.workingDaysPerMonth))).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to MyWallet</h1>
          <p className="text-white/80">Your time-aware financial companion</p>
        </div>

        <Card className="animate-slide-up glass border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {step === 1 && "Let's get to know you"}
              {step === 2 && "Your earning details"}
              {step === 3 && "Work schedule"}
              {step === 4 && "You're all set!"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Tell us your name to personalize your experience"}
              {step === 2 && "Help us calculate your time equivalents"}
              {step === 3 && "Fine-tune your working schedule"}
              {step === 4 && "Ready to start tracking mindfully?"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleNext} className="w-full bg-primary hover:bg-primary-light">
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="earning">Monthly Earning</Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger className="w-24">
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
                    <Input
                      id="earning"
                      type="number"
                      placeholder="5000"
                      value={formData.monthlyEarning}
                      onChange={(e) => setFormData({ ...formData, monthlyEarning: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 bg-primary hover:bg-primary-light">
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hours">Hours/Day</Label>
                    <Input
                      id="hours"
                      type="number"
                      value={formData.workingHoursPerDay}
                      onChange={(e) => setFormData({ ...formData, workingHoursPerDay: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="days">Days/Month</Label>
                    <Input
                      id="days"
                      type="number"
                      value={formData.workingDaysPerMonth}
                      onChange={(e) => setFormData({ ...formData, workingDaysPerMonth: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="p-3 bg-background-secondary rounded-lg text-sm text-muted-foreground">
                  <strong>Your hourly rate:</strong> {formData.currency} {hourlyRate}/hour
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 bg-primary hover:bg-primary-light">
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleComplete} className="flex-1 bg-primary hover:bg-primary-light">
                    Start Tracking
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center mt-6">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
