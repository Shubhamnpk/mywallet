"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Cloud, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ConvexAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess?: () => void;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
  title?: string;
  description?: string;
  showBenefits?: boolean;
  initialMode?: "signin" | "signup";
}

export function ConvexAuthModal({
  open,
  onOpenChange,
  onAuthSuccess,
  signUp,
  signIn,
  isLoading = false,
  title,
  description,
  showBenefits = true,
  initialMode = "signin"
}: ConvexAuthModalProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">(initialMode);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async () => {
    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password');
      return;
    }

    if (authMode === "signup" && !formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsAuthenticating(true);
    try {
      let result;
      if (authMode === "signup") {
        result = await signUp(formData.email, formData.password, formData.name);
      } else {
        result = await signIn(formData.email, formData.password);
      }

      if (result.success) {
        onOpenChange(false);
        setFormData({ email: '', password: '', name: '' });

        if (authMode === "signup") {
          // New account created - redirect to onboarding
          toast.success("Account created! Let's set up your wallet.");
          // Redirect to onboarding will be handled by the parent component
          onAuthSuccess?.();
        } else {
          // Existing account signed in - check if onboarding needed
          toast.success("Signed in! Your data will sync automatically.");
          onAuthSuccess?.();
        }
      } else {
        toast.error(result.error || "Authentication failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({ email: '', password: '', name: '' });
    setAuthMode(initialMode);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            {title || (authMode === "signup" ? "Create Convex Account" : "Sign in to Convex")}
          </DialogTitle>
          <DialogDescription>
            {description || (authMode === "signup"
              ? "Create a new account to sync your wallet data securely across devices."
              : "Sign in to access your existing synced wallet data."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auth Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={authMode === "signin" ? "default" : "outline"}
              size="sm"
              onClick={() => setAuthMode("signin")}
              className="flex-1"
              disabled={isAuthenticating || isLoading}
            >
              Sign In
            </Button>
            <Button
              variant={authMode === "signup" ? "default" : "outline"}
              size="sm"
              onClick={() => setAuthMode("signup")}
              className="flex-1"
              disabled={isAuthenticating || isLoading}
            >
              Sign Up
            </Button>
          </div>

          {/* Name Field (Sign Up Only) */}
          {authMode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="convex-name">Name</Label>
              <Input
                id="convex-name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isAuthenticating || isLoading}
              />
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="convex-email">Email</Label>
            <Input
              id="convex-email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isAuthenticating || isLoading}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="convex-password">Password</Label>
            <Input
              id="convex-password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isAuthenticating || isLoading}
            />
          </div>

          {/* Benefits Section */}
          {showBenefits && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Database className="w-4 h-4" />
                <span className="font-medium text-sm">Sync Benefits</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 🔄 Automatic cross-device sync</li>
                <li>• 🔐 End-to-end encryption</li>
                <li>• 📱 Access data anywhere</li>
                <li>• 💾 Never lose your data</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isAuthenticating || isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAuth}
              disabled={isAuthenticating || isLoading || !formData.email || !formData.password || (authMode === "signup" && !formData.name.trim())}
              className="flex-1"
            >
              {isAuthenticating || isLoading ? "Connecting..." : (authMode === "signup" ? "Create Account" : "Sign In")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
