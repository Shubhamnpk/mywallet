"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Plane,
  MapPin,
  Star,
  Trophy,
  RotateCcw,
  Play,
  Pause,
  Home,
  Mountain,
  Waves,
  TreePine,
  Camera,
  Coffee
} from "lucide-react"
import { toast } from "sonner"

interface TravelLocation {
  id: string
  name: string
  icon: React.ReactNode
  points: number
  rarity: 'common' | 'rare' | 'epic'
  description: string
}

interface GameState {
  score: number
  level: number
  timeLeft: number
  isPlaying: boolean
  isPaused: boolean
  currentLocation: TravelLocation | null
  visitedLocations: string[]
  streak: number
  combo: number
}

const TRAVEL_LOCATIONS: TravelLocation[] = [
  { id: 'paris', name: 'Paris', icon: <Camera className="w-4 h-4" />, points: 10, rarity: 'common', description: 'City of Light' },
  { id: 'tokyo', name: 'Tokyo', icon: <Coffee className="w-4 h-4" />, points: 15, rarity: 'common', description: 'Neon Nights' },
  { id: 'bali', name: 'Bali', icon: <Waves className="w-4 h-4" />, points: 20, rarity: 'rare', description: 'Island Paradise' },
  { id: 'switzerland', name: 'Swiss Alps', icon: <Mountain className="w-4 h-4" />, points: 25, rarity: 'rare', description: 'Mountain Majesty' },
  { id: 'santorini', name: 'Santorini', icon: <Home className="w-4 h-4" />, points: 30, rarity: 'epic', description: 'Greek Paradise' },
  { id: 'iceland', name: 'Iceland', icon: <TreePine className="w-4 h-4" />, points: 35, rarity: 'epic', description: 'Land of Fire and Ice' },
  { id: 'dubai', name: 'Dubai', icon: <Star className="w-4 h-4" />, points: 40, rarity: 'epic', description: 'Desert Luxury' },
  { id: 'newyork', name: 'New York', icon: <Trophy className="w-4 h-4" />, points: 45, rarity: 'epic', description: 'City That Never Sleeps' }
]

interface TravelMiniGameProps {
  isOpen: boolean
  onClose: () => void
}

export function TravelMiniGame({ isOpen, onClose }: TravelMiniGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 1,
    timeLeft: 60,
    isPlaying: false,
    isPaused: false,
    currentLocation: null,
    visitedLocations: [],
    streak: 0,
    combo: 0
  })

  const [showResult, setShowResult] = useState(false)
  const [gameResult, setGameResult] = useState<{ score: number; level: number; locations: number } | null>(null)

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (gameState.isPlaying && !gameState.isPaused && gameState.timeLeft > 0) {
      interval = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1
          if (newTimeLeft <= 0) {
            endGame()
            return { ...prev, timeLeft: 0, isPlaying: false }
          }
          return { ...prev, timeLeft: newTimeLeft }
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [gameState.isPlaying, gameState.isPaused, gameState.timeLeft])

  // Generate random location
  const generateLocation = useCallback(() => {
    const availableLocations = TRAVEL_LOCATIONS.filter(
      loc => !gameState.visitedLocations.includes(loc.id)
    )

    if (availableLocations.length === 0) {
      // All locations visited, reset
      setGameState(prev => ({ ...prev, visitedLocations: [] }))
      return TRAVEL_LOCATIONS[Math.floor(Math.random() * TRAVEL_LOCATIONS.length)]
    }

    return availableLocations[Math.floor(Math.random() * availableLocations.length)]
  }, [gameState.visitedLocations])

  // Start new game
  const startGame = useCallback(() => {
    const firstLocation = generateLocation()
    setGameState({
      score: 0,
      level: 1,
      timeLeft: 60,
      isPlaying: true,
      isPaused: false,
      currentLocation: firstLocation,
      visitedLocations: [],
      streak: 0,
      combo: 0
    })
    setShowResult(false)
    setGameResult(null)
  }, [generateLocation])

  // Visit location
  const visitLocation = useCallback(() => {
    if (!gameState.currentLocation || !gameState.isPlaying) return

    const location = gameState.currentLocation
    const basePoints = location.points
    const comboMultiplier = Math.min(gameState.combo + 1, 5) // Max 5x combo
    const pointsEarned = basePoints * comboMultiplier

    setGameState(prev => {
      const newScore = prev.score + pointsEarned
      const newLevel = Math.floor(newScore / 100) + 1
      const newVisitedLocations = [...prev.visitedLocations, location.id]
      const newStreak = prev.streak + 1
      const newCombo = prev.combo + 1

      // Check for achievements (would integrate with wallet achievements system)
      if (newScore >= 500) {
        // addAchievement('travel_explorer', { score: newScore })
        console.log('Achievement unlocked: Travel Explorer!')
      }
      if (newVisitedLocations.length >= TRAVEL_LOCATIONS.length) {
        // addAchievement('world_traveler', { locations: newVisitedLocations.length })
        console.log('Achievement unlocked: World Traveler!')
      }

      return {
        ...prev,
        score: newScore,
        level: newLevel,
        visitedLocations: newVisitedLocations,
        streak: newStreak,
        combo: newCombo,
        currentLocation: generateLocation()
      }
    })

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }

    toast.success(`Visited ${location.name}! +${pointsEarned} points${comboMultiplier > 1 ? ` (${comboMultiplier}x combo!)` : ''}`)
  }, [gameState.currentLocation, gameState.isPlaying, gameState.combo, generateLocation])

  // Skip location (lose combo)
  const skipLocation = useCallback(() => {
    if (!gameState.isPlaying) return

    setGameState(prev => ({
      ...prev,
      combo: 0,
      currentLocation: generateLocation()
    }))

    toast.info('Location skipped - combo reset!')
  }, [gameState.isPlaying, generateLocation])

  // Pause/Resume game
  const togglePause = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))
  }, [])

  // End game
  const endGame = useCallback(() => {
    const result = {
      score: gameState.score,
      level: gameState.level,
      locations: gameState.visitedLocations.length
    }

    setGameResult(result)
    setShowResult(true)
    setGameState(prev => ({ ...prev, isPlaying: false }))

    // Save high score
    const highScore = localStorage.getItem('travelGameHighScore')
    if (!highScore || gameState.score > parseInt(highScore)) {
      localStorage.setItem('travelGameHighScore', gameState.score.toString())
      toast.success('New high score!')
    }
  }, [gameState.score, gameState.level, gameState.visitedLocations.length])

  // Reset game
  const resetGame = useCallback(() => {
    setGameState({
      score: 0,
      level: 1,
      timeLeft: 60,
      isPlaying: false,
      isPaused: false,
      currentLocation: null,
      visitedLocations: [],
      streak: 0,
      combo: 0
    })
    setShowResult(false)
    setGameResult(null)
  }, [])

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'epic': return 'text-purple-600 bg-purple-100'
      case 'rare': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isOpen) return null

  return (
    <Card className="w-full max-w-md mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plane className="w-5 h-5 text-blue-500" />
              Travel Quest
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!gameState.isPlaying && !showResult && (
            <div className="text-center space-y-4">
              <div className="text-6xl">✈️</div>
              <div>
                <h3 className="text-xl font-bold">Travel Quest</h3>
                <p className="text-sm text-muted-foreground">
                  Visit amazing destinations around the world! Build combos and earn points.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">
                    {localStorage.getItem('travelGameHighScore') || '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">High Score</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">
                    {TRAVEL_LOCATIONS.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Destinations</div>
                </div>
              </div>
              <Button onClick={startGame} className="w-full" size="lg">
                <Play className="w-4 h-4 mr-2" />
                Start Adventure
              </Button>
            </div>
          )}

          {gameState.isPlaying && !showResult && (
            <div className="space-y-4">
              {/* Game Stats */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">{gameState.score}</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{gameState.level}</div>
                  <div className="text-xs text-muted-foreground">Level</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-600">{gameState.timeLeft}s</div>
                  <div className="text-xs text-muted-foreground">Time</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">{gameState.combo}x</div>
                  <div className="text-xs text-muted-foreground">Combo</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Level Progress</span>
                  <span>{(gameState.score % 100)}/100</span>
                </div>
                <Progress value={(gameState.score % 100)} className="h-2" />
              </div>

              {/* Current Location */}
              {gameState.currentLocation && (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-4 text-center space-y-3">
                    <div className="text-4xl">{gameState.currentLocation.icon}</div>
                    <div>
                      <h3 className="font-bold text-lg">{gameState.currentLocation.name}</h3>
                      <p className="text-sm text-muted-foreground">{gameState.currentLocation.description}</p>
                      <Badge className={`mt-2 ${getRarityColor(gameState.currentLocation.rarity)}`}>
                        {gameState.currentLocation.rarity} • {gameState.currentLocation.points} pts
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={visitLocation}
                        className="flex-1"
                        disabled={gameState.isPaused}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Visit
                      </Button>
                      <Button
                        onClick={skipLocation}
                        variant="outline"
                        disabled={gameState.isPaused}
                      >
                        Skip
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Game Controls */}
              <div className="flex gap-2">
                <Button
                  onClick={togglePause}
                  variant="outline"
                  className="flex-1"
                >
                  {gameState.isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
                <Button onClick={endGame} variant="outline">
                  End Game
                </Button>
              </div>
            </div>
          )}

          {showResult && gameResult && (
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <div>
                <h3 className="text-xl font-bold">Adventure Complete!</h3>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{gameResult.score}</div>
                    <div className="text-xs text-muted-foreground">Final Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{gameResult.level}</div>
                    <div className="text-xs text-muted-foreground">Level Reached</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{gameResult.locations}</div>
                    <div className="text-xs text-muted-foreground">Locations Visited</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={startGame} className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
                <Button onClick={resetGame} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
  )
}