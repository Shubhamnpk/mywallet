"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Play, Pause, Cpu, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PingPongGameProps {
  isOpen: boolean
  onClose: () => void
}

const CANVAS_W = 400
const CANVAS_H = 300
const PADDLE_W = 8
const PADDLE_H = 60
const BALL_SIZE = 8
const PADDLE_SPEED = 4
const BALL_SPEED = 3
const WIN_SCORE = 5

interface GameState {
  ballX: number; ballY: number; ballDX: number; ballDY: number
  p1Y: number; p2Y: number
  score1: number; score2: number
  isPlaying: boolean; isPaused: boolean
  winner: string | null
}

function initialGameState(): GameState {
  return {
    ballX: CANVAS_W / 2, ballY: CANVAS_H / 2,
    ballDX: BALL_SPEED, ballDY: BALL_SPEED,
    p1Y: CANVAS_H / 2 - PADDLE_H / 2,
    p2Y: CANVAS_H / 2 - PADDLE_H / 2,
    score1: 0, score2: 0,
    isPlaying: false, isPaused: false,
    winner: null,
  }
}

export function PingPongGame({ isOpen, onClose }: PingPongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const gsRef = useRef<GameState>(initialGameState())
  const keysRef = useRef<Set<string>>(new Set())
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  const [phase, setPhase] = useState<"menu" | "playing">("menu")
  const [gameMode, setGameMode] = useState<"normal" | "ai">("normal")
  const [display, setDisplay] = useState<{ score1: number; score2: number; isPlaying: boolean; isPaused: boolean; winner: string | null }>({
    score1: 0, score2: 0, isPlaying: false, isPaused: false, winner: null,
  })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const gs = gsRef.current

    ctx.fillStyle = "#0a0a0f"
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.strokeStyle = "#ffffff20"
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(CANVAS_W / 2, 0)
    ctx.lineTo(CANVAS_W / 2, CANVAS_H)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = "#ffffff"
    ctx.shadowColor = "#ffffff40"
    ctx.shadowBlur = 8
    ctx.fillRect(0, gs.p1Y, PADDLE_W, PADDLE_H)
    ctx.fillRect(CANVAS_W - PADDLE_W, gs.p2Y, PADDLE_W, PADDLE_H)
    ctx.shadowBlur = 0

    ctx.shadowColor = "#ffffff60"
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(gs.ballX, gs.ballY, BALL_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.font = "bold 28px ui-monospace, monospace"
    ctx.textAlign = "center"
    ctx.fillStyle = "#ffffff40"
    ctx.fillText(String(gs.score1), CANVAS_W / 4, 36)
    ctx.fillText(String(gs.score2), (3 * CANVAS_W) / 4, 36)

    const label = gameMode === "ai" ? "AI" : "P2"
    ctx.font = "10px sans-serif"
    ctx.fillStyle = "#ffffff30"
    ctx.textAlign = "center"
    ctx.fillText("P1", 30, 18)
    ctx.fillText(label, CANVAS_W - 30, 18)
  }, [gameMode])

  const gameLoop = useCallback(() => {
    const gs = gsRef.current
    const keys = keysRef.current

    if (!gs.isPlaying || gs.isPaused || gs.winner) {
      animRef.current = requestAnimationFrame(gameLoop)
      draw()
      return
    }

    if (keys.has("w") || keys.has("arrowup")) gs.p1Y = Math.max(0, gs.p1Y - PADDLE_SPEED)
    if (keys.has("s") || keys.has("arrowdown")) gs.p1Y = Math.min(CANVAS_H - PADDLE_H, gs.p1Y + PADDLE_SPEED)

    if (gameMode === "ai") {
      const target = gs.ballY - PADDLE_H / 2
      const diff = target - gs.p2Y
      const speed = Math.min(PADDLE_SPEED * 0.85, Math.abs(diff) * 0.15)
      if (Math.abs(diff) > 4) gs.p2Y += Math.sign(diff) * speed
      gs.p2Y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, gs.p2Y))
    } else {
      if (keys.has("i")) gs.p2Y = Math.max(0, gs.p2Y - PADDLE_SPEED)
      if (keys.has("k")) gs.p2Y = Math.min(CANVAS_H - PADDLE_H, gs.p2Y + PADDLE_SPEED)
    }

    gs.ballX += gs.ballDX
    gs.ballY += gs.ballDY

    if (gs.ballY - BALL_SIZE / 2 <= 0 || gs.ballY + BALL_SIZE / 2 >= CANVAS_H) {
      gs.ballDY = -gs.ballDY
      gs.ballY = Math.max(BALL_SIZE / 2, Math.min(CANVAS_H - BALL_SIZE / 2, gs.ballY))
    }

    if (
      gs.ballX - BALL_SIZE / 2 <= PADDLE_W &&
      gs.ballY >= gs.p1Y && gs.ballY <= gs.p1Y + PADDLE_H
    ) {
      gs.ballDX = Math.abs(gs.ballDX)
      gs.ballX = PADDLE_W + BALL_SIZE / 2 + 1
    }

    if (
      gs.ballX + BALL_SIZE / 2 >= CANVAS_W - PADDLE_W &&
      gs.ballY >= gs.p2Y && gs.ballY <= gs.p2Y + PADDLE_H
    ) {
      gs.ballDX = -Math.abs(gs.ballDX)
      gs.ballX = CANVAS_W - PADDLE_W - BALL_SIZE / 2 - 1
    }

    if (gs.ballX < 0) {
      gs.score2++
      gs.ballX = CANVAS_W / 2; gs.ballY = CANVAS_H / 2
      gs.ballDX = BALL_SPEED; gs.ballDY = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    }
    if (gs.ballX > CANVAS_W) {
      gs.score1++
      gs.ballX = CANVAS_W / 2; gs.ballY = CANVAS_H / 2
      gs.ballDX = -BALL_SPEED; gs.ballDY = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    }

    if (gs.score1 >= WIN_SCORE || gs.score2 >= WIN_SCORE) {
      if (gs.score1 >= WIN_SCORE) {
        gs.winner = "Player 1"
      } else if (gameMode === "ai") {
        gs.winner = "AI"
      } else {
        gs.winner = "Player 2"
      }
      gs.isPlaying = false
    }

    setDisplay({ score1: gs.score1, score2: gs.score2, isPlaying: gs.isPlaying, isPaused: gs.isPaused, winner: gs.winner })
    draw()
    animRef.current = requestAnimationFrame(gameLoop)
  }, [gameMode, draw])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase())
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animRef.current)
  }, [gameLoop])

  const startGame = useCallback(() => {
    const gs = gsRef.current
    gs.ballX = CANVAS_W / 2; gs.ballY = CANVAS_H / 2
    gs.ballDX = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    gs.ballDY = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    gs.p1Y = CANVAS_H / 2 - PADDLE_H / 2
    gs.p2Y = CANVAS_H / 2 - PADDLE_H / 2
    gs.score1 = 0; gs.score2 = 0
    gs.isPlaying = true; gs.isPaused = false; gs.winner = null
    setDisplay({ score1: 0, score2: 0, isPlaying: true, isPaused: false, winner: null })
    setPhase("playing")
  }, [])

  const togglePause = useCallback(() => {
    gsRef.current.isPaused = !gsRef.current.isPaused
    setDisplay((prev) => ({ ...prev, isPaused: gsRef.current.isPaused }))
  }, [])

  const resetGame = useCallback(() => {
    gsRef.current = initialGameState()
    setDisplay({ score1: 0, score2: 0, isPlaying: false, isPaused: false, winner: null })
  }, [])

  if (!isOpen) return null

  if (phase === "menu") {
    return (
      <Card className="w-full max-w-md mx-auto border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-info font-black">Ping</span>
            <span className="text-foreground font-black">Pong</span>
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="w-3.5 h-3.5" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="text-center space-y-2">
            <div className="text-3xl">🏓</div>
            <h3 className="text-lg font-bold">Ping Pong</h3>
            <p className="text-xs text-muted-foreground">Choose your mode and start playing!</p>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Game Mode</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGameMode("normal")}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                  gameMode === "normal"
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/40 bg-muted/10 text-muted-foreground hover:border-border/60"
                )}
              >
                <Users className="w-5 h-5" />
                <span className="font-bold text-xs">First to 5</span>
                <span className="text-[9px] text-muted-foreground">Play with a friend</span>
              </button>
              <button
                onClick={() => setGameMode("ai")}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                  gameMode === "ai"
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/40 bg-muted/10 text-muted-foreground hover:border-border/60"
                )}
              >
                <Cpu className="w-5 h-5" />
                <span className="font-bold text-xs">vs AI</span>
                <span className="text-[9px] text-muted-foreground">Challenge the computer</span>
              </button>
            </div>
          </div>

          <Button onClick={startGame} className="w-full h-11 rounded-xl font-bold" size="lg">
            <Play className="w-4 h-4 mr-2" /> Start Game
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-info font-black">Ping</span>
          <span className="text-foreground font-black">Pong</span>
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px] h-6">
            {gameMode === "normal" ? (
              <><Users className="w-3 h-3 mr-1" /> First to 5</>
            ) : (
              <><Cpu className="w-3 h-3 mr-1" /> vs AI</>
            )}
          </Badge>
        </div>

        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="border border-border/30 rounded-xl w-full max-w-[400px] shadow-lg"
          />
        </div>

        {isMobile && gameMode === "normal" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground text-center">Player 1</div>
              <div className="flex gap-2 justify-center">
                <Button size="sm" className="h-10 w-10 rounded-xl text-lg"
                  onTouchStart={() => keysRef.current.add("w")}
                  onTouchEnd={() => keysRef.current.delete("w")}
                  onMouseDown={() => keysRef.current.add("w")}
                  onMouseUp={() => keysRef.current.delete("w")}
                  onMouseLeave={() => keysRef.current.delete("w")}
                >↑</Button>
                <Button size="sm" className="h-10 w-10 rounded-xl text-lg"
                  onTouchStart={() => keysRef.current.add("s")}
                  onTouchEnd={() => keysRef.current.delete("s")}
                  onMouseDown={() => keysRef.current.add("s")}
                  onMouseUp={() => keysRef.current.delete("s")}
                  onMouseLeave={() => keysRef.current.delete("s")}
                >↓</Button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground text-center">Player 2</div>
              <div className="flex gap-2 justify-center">
                <Button size="sm" className="h-10 w-10 rounded-xl text-lg"
                  onTouchStart={() => keysRef.current.add("i")}
                  onTouchEnd={() => keysRef.current.delete("i")}
                  onMouseDown={() => keysRef.current.add("i")}
                  onMouseUp={() => keysRef.current.delete("i")}
                  onMouseLeave={() => keysRef.current.delete("i")}
                >↑</Button>
                <Button size="sm" className="h-10 w-10 rounded-xl text-lg"
                  onTouchStart={() => keysRef.current.add("k")}
                  onTouchEnd={() => keysRef.current.delete("k")}
                  onMouseDown={() => keysRef.current.add("k")}
                  onMouseUp={() => keysRef.current.delete("k")}
                  onMouseLeave={() => keysRef.current.delete("k")}
                >↓</Button>
              </div>
            </div>
          </div>
        )}

        {!isMobile && (
          <div className="text-[10px] text-muted-foreground bg-muted/20 p-2 rounded-lg text-center font-medium">
            P1: <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-[9px]">W</kbd> <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-[9px]">S</kbd>
            {gameMode === "normal" ? <> | P2: <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-[9px]">I</kbd> <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-[9px]">K</kbd></> : null}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPhase("menu")}
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Change mode
          </button>
        </div>
        <div className="flex gap-2 justify-center">
          {!display.isPlaying && !display.winner && (
            <Button onClick={startGame} size="sm" className="h-8 text-xs">
              <Play className="w-3 h-3 mr-1" /> Start Game
            </Button>
          )}
          {display.isPlaying && !display.winner && (
            <Button onClick={togglePause} variant="outline" size="sm" className="h-8 text-xs">
              {display.isPaused ? <><Play className="w-3 h-3 mr-1" /> Resume</> : <><Pause className="w-3 h-3 mr-1" /> Pause</>}
            </Button>
          )}
          {display.winner && (
            <Button onClick={startGame} size="sm" className="h-8 text-xs">
              <RotateCcw className="w-3 h-3 mr-1" /> Play Again
            </Button>
          )}
          <Button onClick={resetGame} variant="outline" size="sm" className="h-8 text-xs">
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
        </div>

        {display.winner && (
          <div className="text-center text-sm font-bold text-success py-1">
            🎉 {display.winner} Wins! 🎉
          </div>
        )}
      </CardContent>
    </Card>
  )
}
