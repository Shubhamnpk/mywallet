"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Info, RefreshCw, ExternalLink, Github, User, Heart, Star, Building } from "lucide-react"
import { useState } from "react"

export function AboutSettings() {
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    // Simulate checking for updates
    await new Promise(resolve => setTimeout(resolve, 2000))
    setCheckingUpdate(false)
    // In a real app, this would check for updates
  }

  const handleGithubLink = () => {
    window.open('https://github.com/shubhamy/my-wallet-app', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* App Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5" />
            My Wallet App
          </CardTitle>
          <CardDescription>Your personal finance management companion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Version</span>
            <Badge variant="secondary">v0.1.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Build</span>
            <span className="text-sm text-muted-foreground">2025.01.01</span>
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
                <p className="text-sm text-muted-foreground">You're running the latest version</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Up to date
              </Badge>
            </div>
            <Separator />
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
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Features Guide</div>
                <div className="text-sm text-muted-foreground">Explore all app features</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Help & Support</div>
                <div className="text-sm text-muted-foreground">Get help and support</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Privacy Policy</div>
                <div className="text-sm text-muted-foreground">How we protect your data</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
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
              <p className="font-medium">Shubham Nirual</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="font-medium text-sm">OSS</div>
                <div className="text-xs text-muted-foreground mt-1">Open Source Software</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="font-medium text-sm">BitNepal</div>
                <div className="text-xs text-muted-foreground mt-1">Technology Partner</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
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