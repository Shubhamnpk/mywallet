"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { validatePin } from "@/lib/security"
import { Wallet, Lock, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PinLockScreenProps {
  hashedPin: string
  onUnlock: () => void
}

export function PinLockScreen({ hashedPin, onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)

  const handlePinSubmit = () => {
    if (validatePin(pin, hashedPin)) {
      onUnlock()
      toast({
        title: "Welcome Back!",
        description: "PIN verified successfully.",
      })
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setPin("")

      if (newAttempts >= 3) {
        setIsLocked(true)
        toast({
          title: "Too Many Attempts",
          description: "Please wait 30 seconds before trying again.",
          variant: "destructive",
        })

        // Lock for 30 seconds
        setTimeout(() => {
          setIsLocked(false)
          setAttempts(0)
        }, 30000)
      } else {
        toast({
          title: "Incorrect PIN",
          description: `${3 - newAttempts} attempts remaining.`,
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" />
            MyWallet Locked
          </CardTitle>
          <CardDescription>Enter your PIN to access your wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={pin} onChange={setPin} disabled={isLocked}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {attempts > 0 && !isLocked && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>{3 - attempts} attempts remaining</span>
            </div>
          )}

          {isLocked && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>Too many attempts. Please wait 30 seconds.</span>
            </div>
          )}

          <Button onClick={handlePinSubmit} disabled={pin.length !== 6 || isLocked} className="w-full">
            {isLocked ? "Locked" : "Unlock Wallet"}
          </Button>

          <div className="text-center text-xs text-muted-foreground">Your data is secure and encrypted locally</div>
        </CardContent>
      </Card>
    </div>
  )
}
