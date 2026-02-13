"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, ExternalLink, Github, User, Heart, Star, Building, Info } from "lucide-react"
import { useState, useRef } from "react"
import { toast } from 'sonner'
import { usePWAUpdate } from '@/components/pwa/usePWAUpdate'
import { Switch } from '@/components/ui/switch'
import packageJson from '../../package.json'
import Link from "next/link"

export function AboutSettings() {
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const tapTriggered = useRef(false)
  const {
    isSupported,
    isUpdateAvailable,
    autoUpdate,
    setAutoUpdate,
    applyUpdate,
    checkForUpdate
  } = usePWAUpdate()

  const handleCheckUpdate = async () => {
    if (checkingUpdate || !isSupported) return
    setCheckingUpdate(true)
    try {
      // Ask the SW to update
      await checkForUpdate()
    } catch (e) {
      toast.error('Failed to check for updates')
    } finally {
      // Small UI delay
      await new Promise((resolve) => setTimeout(resolve, 600))
      setCheckingUpdate(false)
    }
  }

  const handleBuildTap = () => {
    if (tapTriggered.current) return
    tapTriggered.current = true
    toast.success("🎉 Easter Egg! You've unlocked the secret: Infinite wallet wisdom! (But seriously, keep managing your finances wisely 😄)")
    setTimeout(() => {
      tapTriggered.current = false
    }, 3000) // reset after 3 seconds
  }

  const openExternal = (url: string) => {
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
      if (newWindow) newWindow.opener = null
    } catch (e) {
      // fallback for strict CSP or other issues
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.click()
    }
  }

  const handleGithubLink = () => openExternal('https://github.com/Shubhamnpk/mywallet')
  const handleFeaturesGuide = () => openExternal('https://github.com/Shubhamnpk/mywallet#readme')
  const handleHelpSupport = () => openExternal('https://github.com/Shubhamnpk/mywallet/issues')
  const handlePrivacyPolicy = () => openExternal('https://github.com/Shubhamnpk/mywallet/blob/main/PRIVACY.md')
  const handleTermsOfService = () => openExternal('https://github.com/Shubhamnpk/mywallet/blob/main/TERMS.md')

  const handleOSSCard = () => openExternal('https://github.com/Shubhamnpk/mywallet')
  const handleBitNepalCard = () => openExternal('https://bit-nepal.com')
  const handleYoguruCard = () => openExternal('https://yoguru.odoo.com')


  // Helper to clear caches and unregister service workers
  async function clearAllCachesAndData() {
    // Only delete caches that are app/service-worker related to avoid removing user data
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await caches.keys()
      // conservative whitelist: only remove caches that look like SW or app asset caches
      const keepPattern = /(^(?!.*(?:workbox|precache|next|static-resources|next-static|images|start-url)).*$)/i
      const toDelete = keys.filter(name => {
        // remove if it matches known SW/cache names
        return /workbox|precache|next|static-resources|next-static|images|start-url/i.test(name)
      })
      await Promise.all(toDelete.map(k => caches.delete(k)))
    }

    // Unregister service workers (optional; keeps app behavior consistent)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
  }

  const handleClearCaches = async () => {
    if (!confirm('Clear app caches (UI assets) and unregister service workers? This will NOT delete your app data (localStorage/IndexedDB).')) return
    setClearingCache(true)
    try {
      await clearAllCachesAndData()
      toast.success('App caches cleared (UI) and service workers unregistered')
    } catch (e) {
      toast.error('Failed to clear caches')
    } finally {
      setClearingCache(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* App Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-6 h-6 rounded-md" />
            My Wallet App
          </CardTitle>
          <CardDescription>Your personal finance management companion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Version</span>
            <Badge variant="secondary">v{process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Build</span>
            <span
              className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 px-1 rounded transition-colors font-mono"
              onClick={handleBuildTap}
              onTouchEnd={(e) => {
                e.preventDefault()
                handleBuildTap()
              }}
              title="Development build - click for easter egg!"
            >
              {process.env.NEXT_PUBLIC_BUILD_NUMBER || 'dev'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Platform</span>
            <span className="text-sm text-muted-foreground">Web Application</span>
          </div>
        </CardContent>
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="w-5 h-5" />
            Updates
          </CardTitle>
          <CardDescription>Keep your app up to date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Version</p>
                 <p className="text-sm text-muted-foreground">
                 {isUpdateAvailable ? 'An update is available' : "You're running the latest version"}
               </p>
              </div>
              <div className="flex flex-col items-end">
                <Badge variant={isUpdateAvailable ? 'destructive' : 'outline'} className={isUpdateAvailable ? 'text-red-600 border-red-600' : 'text-green-600 border-green-600'}>
                  {isUpdateAvailable ? 'Update available' : 'Up to date'}
                </Badge>
                {isSupported && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Switch checked={autoUpdate} onCheckedChange={(v) => setAutoUpdate(!!v)} />
                    <span className="text-xs text-muted-foreground">Auto update when online</span>
                  </div>
                )}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className="w-full"
              >
                {checkingUpdate ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking for updates...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check for Updates
                  </>
                )}
              </Button>
              <div className="mt-2">
              <Button onClick={handleClearCaches} variant="ghost" className="w-full" disabled={clearingCache}>
                {clearingCache ? 'Clearing caches...' : 'Clear caches'}
              </Button>
            </div>
              <Button variant="secondary" className="w-full" asChild>
                <Link href="/releases">
                  View Release Notes
                </Link>
              </Button>
              {isUpdateAvailable && (
                <div className="flex gap-2">
                  <Button onClick={applyUpdate} className="flex-1">
                    Apply Update
                  </Button>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Reload
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* More Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ExternalLink className="w-5 h-5" />
            More Information
          </CardTitle>
          <CardDescription>Learn more about features and support</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto p-4" asChild>
              <Link href="/releases">
                <div className="text-left">
                  <div className="font-medium">Release Notes</div>
                  <div className="text-sm text-muted-foreground">See shipped versions and changes</div>
                </div>
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4" onClick={handleFeaturesGuide}>
              <div className="text-left">
                <div className="font-medium">Features Guide</div>
                <div className="text-sm text-muted-foreground">Explore all app features</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4" onClick={handleHelpSupport}>
              <div className="text-left">
                <div className="font-medium">Help & Support</div>
                <div className="text-sm text-muted-foreground">Get help and support</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4" onClick={handlePrivacyPolicy}>
              <div className="text-left">
                <div className="font-medium">Privacy Policy</div>
                <div className="text-sm text-muted-foreground">How we protect your data</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4" onClick={handleTermsOfService}>
              <div className="text-left">
                <div className="font-medium">Terms of Service</div>
                <div className="text-sm text-muted-foreground">Our terms and conditions</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Developer */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            Developer
          </CardTitle>
          <CardDescription>Meet the creator behind My Wallet App</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Shubham Niraual</p>
              <p className="text-sm text-muted-foreground">Full Stack Developer</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Passionate about creating intuitive and secure financial tools to help people manage their money better.
          </p>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              <Heart className="w-3 h-3 mr-1" />
              Open Source
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              React & Next.js
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="w-5 h-5" />
            Branding & Partners
          </CardTitle>
          <CardDescription>Organizations and communities behind this app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
              <div
                className="text-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleOSSCard}
              >
                <div className="font-medium text-sm">OSS</div>
                <div className="text-xs text-muted-foreground mt-1">Open Source Software</div>
              </div>
              <div
                className="text-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleBitNepalCard}
              >
                <div className="font-medium text-sm">BitNepal</div>
                <div className="text-xs text-muted-foreground mt-1">Technology Partner</div>
              </div>
              <div
                className="text-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleYoguruCard}
              >
                <div className="font-medium text-sm">Yoguru</div>
                <div className="text-xs text-muted-foreground mt-1">Community Partner</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Proudly built with contributions from the open source community and our partners.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* GitHub */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Github className="w-5 h-5" />
            GitHub Repository
          </CardTitle>
          <CardDescription>Contribute to the project or report issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This app is open source! Feel free to contribute, report bugs, or suggest new features.
            </p>
            <Button onClick={handleGithubLink} className="w-full">
              <Github className="w-4 h-4 mr-2" />
              View on GitHub
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
