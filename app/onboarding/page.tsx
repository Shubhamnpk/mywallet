"use client"

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Dynamically import the OnboardingFlow component for better performance
const OnboardingFlow = dynamic(() => import('@/components/onboarding/onboarding-flow'), {
  loading: () => <OnboardingLoadingSkeleton />,
  ssr: false // Disable SSR for this component as it uses browser APIs
})

// Enhanced loading skeleton with better UX
function OnboardingLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-3">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl glass border-white/20">
          <CardHeader className="text-center pb-3">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">
              <div className="h-6 bg-white/20 rounded w-3/4 mx-auto animate-pulse" />
            </CardTitle>
            <CardDescription className="text-sm">
              <div className="h-4 bg-white/10 rounded w-1/2 mx-auto animate-pulse mt-2" />
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="h-10 bg-white/10 rounded animate-pulse" />
              <div className="h-10 bg-white/10 rounded animate-pulse" />
              <div className="h-32 bg-white/10 rounded animate-pulse" />
            </div>

            <div className="flex gap-3 mt-6">
              <div className="h-10 bg-white/10 rounded flex-1 animate-pulse" />
              <div className="h-10 bg-primary/20 rounded flex-1 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-2 h-2 bg-white/30 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Error boundary component
function OnboardingErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Onboarding error:', error.error)
      setError(error.error)
      setHasError(true)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Onboarding unhandled rejection:', event.reason)
      setError(new Error(event.reason?.toString() || 'Unknown error'))
      setHasError(true)
    })

    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-3">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-xl glass border-white/20">
            <CardHeader className="text-center pb-3">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-destructive/20 via-destructive/10 to-destructive/5 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-destructive">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-sm">
                We encountered an error while loading the onboarding experience.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-mono">
                      {error.message}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => router.push('/')}
                    className="flex-1"
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Main onboarding page component with modern features
export default function OnboardingPage() {
  const [isClient, setIsClient] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const router = useRouter()

  // Ensure we're on the client side before rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check localStorage immediately for redirect conditions
  useEffect(() => {
    if (isClient) {
      const userProfile = localStorage.getItem('userProfile')
      const isFirstTime = localStorage.getItem('isFirstTime')

      // Redirect if userProfile exists OR isFirstTime is 'false'
      if (userProfile || isFirstTime === 'false') {
        setShouldRedirect(true)
        router.push('/')
      }
    }
  }, [isClient, router])

  // Show loading state during hydration
  if (!isClient) {
    return <OnboardingLoadingSkeleton />
  }

  // If redirect is triggered, show loading while redirecting
  if (shouldRedirect) {
    return <OnboardingLoadingSkeleton />
  }

  return (
    <OnboardingErrorBoundary>
      <Suspense fallback={<OnboardingLoadingSkeleton />}>
        <OnboardingFlow />
      </Suspense>
    </OnboardingErrorBoundary>
  )
}
