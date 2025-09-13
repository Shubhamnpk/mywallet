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

        // Validate that the stored user ID is actually a user ID (not a budget or other table ID)
        // User IDs should start with a specific pattern or we can check the format
        const isValidUserId = storedUserId.startsWith('u') || storedUserId.length === 32

        if (!isValidUserId) {
          console.warn("Invalid user ID detected, clearing stored auth data:", storedUserId)
          localStorage.removeItem("convex_user")
          localStorage.removeItem("convex_user_id")
          setAuthState(prev => ({ ...prev, isLoading: false }))
          return
        }

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

  // Helper function to validate user ID format
  const isValidUserId = (userId: string): boolean => {
    // Convex user IDs are typically 32-character strings
    // They don't contain special characters that would indicate other table IDs
    return Boolean(userId && typeof userId === 'string' && userId.length >= 20 && !userId.includes('_') && !userId.includes('-'))
  }

  const signUpMutation = useMutation(api.auth.signUp)
  const signInMutation = useMutation(api.auth.signIn)
  // Re-enable getCurrentUser query - Convex handles ID validation internally
  const getCurrentUser = useQuery(
    api.auth.getCurrentUser,
    authState.isAuthenticated && authState.user?.id ? { userId: authState.user.id as any } : "skip"
  )

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))

      const result = await signUpMutation({ email, password, name })

      // Validate that we got a proper user ID
      if (!result.userId || typeof result.userId !== 'string') {
        throw new Error("Invalid user ID received from server")
      }

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

      // Validate that we got a proper user ID
      if (!result.userId || typeof result.userId !== 'string') {
        throw new Error("Invalid user ID received from server")
      }

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
    // Clear all Convex-related data from localStorage
    const convexKeysToRemove = [
      "convex_user",
      "convex_user_id",
      "convex_device_id",
      "convex_device_name",
      "convex_sync_password",
      "convex_sync_salt",
      "convex_sync_enabled",
      "convex_last_sync_time",
      "convex_sync_paused",
      "convex_sync_auto_enabled",
      "sync_manually_disabled"
    ]

    convexKeysToRemove.forEach(key => localStorage.removeItem(key))

    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    })

    toast({
      title: "Signed Out",
      description: "You have been signed out of your Convex sync account. All Convex-related data has been cleared from local storage.",
    })
  }

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
  }
}
