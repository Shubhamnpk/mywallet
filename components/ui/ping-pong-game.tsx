"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Play, Pause, Home, Cpu } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"

interface PingPongGameProps {
  isOpen: boolean
  onClose: () => void
}

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number }
  paddle1: { y: number; score: number }
  paddle2: { y: number; score: number }
  isPlaying: boolean
  isPaused: boolean
  gameMode: 'normal' | 'infinity' | 'ai'
  winner: string | null
}

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 300
const PADDLE_WIDTH = 10
const PADDLE_HEIGHT = 80
const BALL_SIZE = 10
const PADDLE_SPEED = 5
const BALL_SPEED = 3

export function PingPongGame({ isOpen, onClose }: PingPongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const isMobile = useIsMobile()

  const [gameState, setGameState] = useState<GameState>({
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: BALL_SPEED, dy: BALL_SPEED },
    paddle1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
    paddle2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
    isPlaying: false,
    isPaused: false,
    gameMode: 'normal',
    winner: null
  })

  const [keys, setKeys] = useState<Set<string>>(new Set())

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.key.toLowerCase()))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev)
        newKeys.delete(e.key.toLowerCase())
        return newKeys
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.winner) return

    setGameState(prev => {
      const newState = { ...prev }

      // Move paddles
      if (keys.has('w') && newState.paddle1.y > 0) {
        newState.paddle1.y -= PADDLE_SPEED
      }
      if (keys.has('s') && newState.paddle1.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        newState.paddle1.y += PADDLE_SPEED
      }
      if (keys.has('arrowup') && newState.paddle2.y > 0) {
        newState.paddle2.y -= PADDLE_SPEED
      }
      if (keys.has('arrowdown') && newState.paddle2.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        newState.paddle2.y += PADDLE_SPEED
      }

      // Move ball
      newState.ball.x += newState.ball.dx
      newState.ball.y += newState.ball.dy

      // Ball collision with top/bottom walls
      if (newState.ball.y <= 0 || newState.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
        newState.ball.dy = -newState.ball.dy
      }

      // Ball collision with paddles
      if (
        newState.ball.x <= PADDLE_WIDTH &&
        newState.ball.y + BALL_SIZE >= newState.paddle1.y &&
        newState.ball.y <= newState.paddle1.y + PADDLE_HEIGHT
      ) {
        newState.ball.dx = -newState.ball.dx
        newState.ball.x = PADDLE_WIDTH
      }

      if (
        newState.ball.x + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH &&
        newState.ball.y + BALL_SIZE >= newState.paddle2.y &&
        newState.ball.y <= newState.paddle2.y + PADDLE_HEIGHT
      ) {
        newState.ball.dx = -newState.ball.dx
        newState.ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE
      }

      // Score points
      if (newState.ball.x < 0) {
        newState.paddle2.score++
        newState.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: BALL_SPEED, dy: BALL_SPEED }
      }

      if (newState.ball.x > CANVAS_WIDTH) {
        newState.paddle1.score++
        newState.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: -BALL_SPEED, dy: BALL_SPEED }
      }

      // AI movement for AI mode
      if (newState.gameMode === 'ai' && newState.isPlaying) {
        // Simple AI: follow the ball with some delay
        const aiPaddleCenter = newState.paddle2.y + PADDLE_HEIGHT / 2
        const ballCenter = newState.ball.y + BALL_SIZE / 2
        const aiSpeed = PADDLE_SPEED * 0.8 // Slightly slower than human

        if (ballCenter < aiPaddleCenter - 10 && newState.paddle2.y > 0) {
          newState.paddle2.y -= aiSpeed
        } else if (ballCenter > aiPaddleCenter + 10 && newState.paddle2.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
          newState.paddle2.y += aiSpeed
        }
      }

      // Check for winner (normal mode)
      if (newState.gameMode === 'normal' && (newState.paddle1.score >= 5 || newState.paddle2.score >= 5)) {
        newState.winner = newState.paddle1.score >= 5 ? 'Player 1' : 'Player 2'
        newState.isPlaying = false
      }

      return newState
    })

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [gameState.isPlaying, gameState.isPaused, gameState.winner, keys])

  // Start game loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.winner) {
      animationRef.current = requestAnimationFrame(gameLoop)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameLoop, gameState.isPlaying, gameState.isPaused, gameState.winner])

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw center line
    ctx.strokeStyle = '#fff'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(CANVAS_WIDTH / 2, 0)
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw paddles
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, gameState.paddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT)
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT)

    // Draw ball
    ctx.beginPath()
    ctx.arc(gameState.ball.x + BALL_SIZE / 2, gameState.ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw scores
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(gameState.paddle1.score.toString(), CANVAS_WIDTH / 4, 40)
    ctx.fillText(gameState.paddle2.score.toString(), (3 * CANVAS_WIDTH) / 4, 40)
  }, [gameState])

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: BALL_SPEED, dy: BALL_SPEED },
      paddle1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
      paddle2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
      isPlaying: true,
      isPaused: false,
      winner: null
    }))
  }, [])

  const togglePause = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))
  }, [])

  const resetGame = useCallback(() => {
    setGameState({
      ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: BALL_SPEED, dy: BALL_SPEED },
      paddle1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
      paddle2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
      isPlaying: false,
      isPaused: false,
      gameMode: gameState.gameMode,
      winner: null
    })
  }, [gameState.gameMode])

  const toggleGameMode = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gameMode: prev.gameMode === 'normal' ? 'infinity' : prev.gameMode === 'infinity' ? 'ai' : 'normal'
    }))
  }, [])

  if (!isOpen) return null

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="w-5 h-5 text-blue-500" />
            Ping Pong
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Game Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Mode:</span>
          <Badge
            variant="outline"
            className="cursor-pointer"
            onClick={toggleGameMode}
          >
            {gameState.gameMode === 'normal' ? 'First to 5' : gameState.gameMode === 'infinity' ? 'Infinity' : 'vs AI'}
          </Badge>
        </div>

        {/* Game Canvas */}
        <div className="flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border-2 border-border rounded-xl bg-black shadow-lg"
            />
            {/* Mobile Controls Overlay */}
            {isMobile && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-auto">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full shadow-lg"
                    onTouchStart={(e) => {
                      e.preventDefault()
                      setKeys(prev => new Set(prev).add('w'))
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      setKeys(prev => {
                        const newKeys = new Set(prev)
                        newKeys.delete('w')
                        return newKeys
                      })
                    }}
                    onMouseDown={() => setKeys(prev => new Set(prev).add('w'))}
                    onMouseUp={() => setKeys(prev => {
                      const newKeys = new Set(prev)
                      newKeys.delete('w')
                      return newKeys
                    })}
                  >
                    ↑
                  </Button>
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full shadow-lg"
                    onTouchStart={(e) => {
                      e.preventDefault()
                      setKeys(prev => new Set(prev).add('s'))
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      setKeys(prev => {
                        const newKeys = new Set(prev)
                        newKeys.delete('s')
                        return newKeys
                      })
                    }}
                    onMouseDown={() => setKeys(prev => new Set(prev).add('s'))}
                    onMouseUp={() => setKeys(prev => {
                      const newKeys = new Set(prev)
                      newKeys.delete('s')
                      return newKeys
                    })}
                  >
                    ↓
                  </Button>
                </div>
                <div className="absolute top-4 right-4 text-white text-sm bg-black/50 px-2 py-1 rounded">
                  P1
                </div>
                <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-2 py-1 rounded">
                  {gameState.gameMode === 'ai' ? 'AI' : 'P2'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="text-center space-y-2">
          {!isMobile && (
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded-lg">
              Player 1: W/S | Player 2: ↑/↓
            </div>
          )}
          {isMobile && (
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded-lg">
              Use the on-screen buttons or tilt your device to control paddles
            </div>
          )}

          {!gameState.isPlaying && !gameState.winner && (
            <Button onClick={startGame}>
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          )}

          {gameState.isPlaying && !gameState.winner && (
            <Button onClick={togglePause} variant="outline">
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
          )}

          {gameState.winner && (
            <div className="space-y-2">
              <div className="text-xl font-bold text-green-600">
                🎉 {gameState.winner} Wins! 🎉
              </div>
              <Button onClick={startGame}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          )}

          <Button onClick={resetGame} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}