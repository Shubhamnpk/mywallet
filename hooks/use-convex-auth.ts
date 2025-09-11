"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "@/hooks/use-toast"

interface ConvexUser {
  id: string
  email: string
  name?: string
  createdAt: number
  lastLoginAt: number
}

interface ConvexAuthState {
  user: ConvexUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useConvexAuth() {
  const [authState, setAuthState] = useState<ConvexAuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("convex_user")
    const storedUserId = localStorage.getItem("convex_user_id")

    if (storedUser && storedUserId) {
      try {
        const user = JSON.parse(storedUser)
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        })
      } catch (error) {
        console.error("Failed to parse stored user:", error)
        localStorage.removeItem("convex_user")
        localStorage.removeItem("convex_user_id")
        setAuthState(prev => ({ ...prev, isLoading: false }))
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  const signUpMutation = useMutation(api.auth.signUp)
  const signInMutation = useMutation(api.auth.signIn)
  const getCurrentUser = useQuery(
    api.auth.getCurrentUser,
    authState.isAuthenticated && authState.user?.id ? { userId: authState.user.id as any } : "skip"
  )

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))

      const result = await signUpMutation({ email, password, name })

      const user: ConvexUser = {
        id: result.userId,
        email: result.email,
        name: name,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      }

      // Store in localStorage
      localStorage.setItem("convex_user", JSON.stringify(user))
      localStorage.setItem("convex_user_id", result.userId)

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      })

      // Automatically enable sync for new users
      localStorage.setItem("convex_sync_auto_enabled", "true")
      localStorage.setItem("convex_sync_enabled", "true")

      toast({
        title: "Account Created",
        description: "Your Convex sync account has been created successfully.",
      })

      return { success: true, user }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }))

      const errorMessage = error.message || "Failed to create account"
      toast({
        title: "Sign Up Failed",
        description: errorMessage,
        variant: "destructive",
      })

      return { success: false, error: errorMessage }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))

      const result = await signInMutation({ email, password })

      const user: ConvexUser = {
        id: result.userId,
        email: result.email,
        name: result.name,
        createdAt: Date.now(), // This would be better fetched from the user record
        lastLoginAt: Date.now(),
      }

      // Store in localStorage
      localStorage.setItem("convex_user", JSON.stringify(user))
      localStorage.setItem("convex_user_id", result.userId)

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      })

      // Automatically enable sync for signed-in users
      // The useConvexSync hook will detect authentication and enable sync
      localStorage.setItem("convex_sync_auto_enabled", "true")

      // Also set sync as enabled for this user
      localStorage.setItem("convex_sync_enabled", "true")

      toast({
        title: "Signed In",
        description: "Successfully signed in to your Convex sync account.",
      })

      return { success: true, user }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }))

      const errorMessage = error.message || "Failed to sign in"
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      })

      return { success: false, error: errorMessage }
    }
  }

  const signOut = () => {
    localStorage.removeItem("convex_user")
    localStorage.removeItem("convex_user_id")

    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    })

    toast({
      title: "Signed Out",
      description: "You have been signed out of your Convex sync account.",
    })
  }

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
  }
}
