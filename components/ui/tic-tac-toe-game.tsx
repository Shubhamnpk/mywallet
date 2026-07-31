"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, RotateCcw, Cpu, Users, X, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TicTacToeGameProps {
  isOpen: boolean
  onClose: () => void
}

type Player = "X" | "O" | null
type Board = Player[]
type GameMode = "human" | "ai"
type Phase = "menu" | "playing"

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export function TicTacToeGame({ isOpen, onClose }: TicTacToeGameProps) {
  const [phase, setPhase] = useState<Phase>("menu")
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X")
  const [winner, setWinner] = useState<Player>(null)
  const [isDraw, setIsDraw] = useState(false)
  const [gameMode, setGameMode] = useState<GameMode>("human")
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 })
  const [isAiThinking, setIsAiThinking] = useState(false)

  const checkWinner = useCallback((b: Board): Player => {
    for (const [a, c, d] of WINNING_COMBINATIONS) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]
    }
    return null
  }, [])

  const isBoardFull = useCallback((b: Board) => b.every((cell) => cell !== null), [])

  const getBestMove = useCallback((b: Board, player: Player): number => {
    const opponent = player === "X" ? "O" : "X"

    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const test = [...b]
        test[i] = player
        if (checkWinner(test) === player) return i
      }
    }

    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const test = [...b]
        test[i] = opponent
        if (checkWinner(test) === opponent) return i
      }
    }

    if (!b[4]) return 4
    const corners = [0, 2, 6, 8].filter((i) => !b[i])
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)]
    const edges = [1, 3, 5, 7].filter((i) => !b[i])
    if (edges.length) return edges[Math.floor(Math.random() * edges.length)]
    return -1
  }, [checkWinner])

  const makeMove = useCallback((index: number) => {
    if (board[index] || winner || isDraw || isAiThinking) return

    const newBoard = [...board]
    newBoard[index] = currentPlayer
    const newWinner = checkWinner(newBoard)
    const newIsDraw = !newWinner && isBoardFull(newBoard)

    if (newWinner || newIsDraw) {
      setBoard(newBoard)
      setWinner(newWinner)
      setIsDraw(newIsDraw)
      setScores((prev) => ({
        ...prev,
        [newWinner || "draws"]: prev[newWinner || "draws"] + 1,
      }))
      return
    }

    setBoard(newBoard)
    setCurrentPlayer(currentPlayer === "X" ? "O" : "X")
  }, [board, currentPlayer, winner, isDraw, isAiThinking, checkWinner, isBoardFull])

  useEffect(() => {
    if (gameMode === "ai" && currentPlayer === "O" && !winner && !isDraw) {
      setIsAiThinking(true)
      const timer = setTimeout(() => {
        const move = getBestMove(board, "O")
        if (move !== -1) {
          const newBoard = [...board]
          newBoard[move] = "O"
          const newWinner = checkWinner(newBoard)
          const newIsDraw = !newWinner && isBoardFull(newBoard)

          if (newWinner || newIsDraw) {
            setBoard(newBoard)
            setWinner(newWinner)
            setIsDraw(newIsDraw)
            setScores((prev) => ({
              ...prev,
              [newWinner || "draws"]: prev[newWinner || "draws"] + 1,
            }))
          } else {
            setBoard(newBoard)
            setCurrentPlayer("X")
          }
        }
        setIsAiThinking(false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [gameMode, currentPlayer, winner, isDraw, board, getBestMove, checkWinner, isBoardFull])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhase("menu")
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer("X")
    setWinner(null)
    setIsDraw(false)
    setIsAiThinking(false)
  }, [])

  const resetScores = useCallback(() => {
    setScores({ X: 0, O: 0, draws: 0 })
    resetGame()
  }, [resetGame])

  const startGame = useCallback(() => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer("X")
    setWinner(null)
    setIsDraw(false)
    setIsAiThinking(false)
    setPhase("playing")
  }, [])

  if (!isOpen) return null

  const statusText = winner
    ? `${winner === "X" ? "Player X" : gameMode === "ai" ? "AI" : "Player O"} Wins!`
    : isDraw
      ? "It's a Draw!"
      : isAiThinking
        ? "AI is thinking..."
        : `Player ${currentPlayer}'s Turn`

  if (phase === "menu") {
    return (
      <Card className="w-full max-w-md mx-auto border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <X className="w-4 h-4 text-info" />
            <span className="text-info font-black">Tic</span>
            <span className="text-muted-foreground font-black">Tac</span>
            <Circle className="w-4 h-4 text-error" />
            <span className="text-error font-black">Toe</span>
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="w-3.5 h-3.5" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="text-center space-y-2">
            <div className="text-3xl">❌⭕</div>
            <h3 className="text-lg font-bold">Tic Tac Toe</h3>
            <p className="text-xs text-muted-foreground">Choose your mode and start playing!</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Game Mode</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGameMode("human")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                    gameMode === "human"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/40 bg-muted/10 text-muted-foreground hover:border-border/60"
                  )}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-bold text-xs">Human vs Human</span>
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
                  <span className="font-bold text-xs">Human vs AI</span>
                  <span className="text-[9px] text-muted-foreground">Challenge the computer</span>
                </button>
              </div>
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
          <X className="w-4 h-4 text-info" />
          <span className="text-info font-black">Tic</span>
          <span className="text-muted-foreground font-black">Tac</span>
          <Circle className="w-4 h-4 text-error" />
          <span className="text-error font-black">Toe</span>
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className="text-[10px] h-6"
          >
            {gameMode === "human" ? (
              <><Users className="w-3 h-3 mr-1" /> Human vs Human</>
            ) : (
              <><Cpu className="w-3 h-3 mr-1" /> Human vs AI</>
            )}
          </Badge>
          <button
            onClick={() => setPhase("menu")}
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Change mode
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
          <div className="p-2 rounded-lg bg-info/5">
            <div className="text-lg font-black text-info">{scores.X}</div>
            <div className="text-muted-foreground">Player X</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/20">
            <div className="text-lg font-black text-muted-foreground">{scores.draws}</div>
            <div className="text-muted-foreground">Draws</div>
          </div>
          <div className="p-2 rounded-lg bg-error/5">
            <div className="text-lg font-black text-error">{scores.O}</div>
            <div className="text-muted-foreground">{gameMode === "ai" ? "AI" : "Player O"}</div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-1.5 w-full max-w-64 bg-muted/10 p-2 rounded-xl border border-border/30">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => makeMove(index)}
                disabled={!!cell || !!winner || isDraw || isAiThinking}
                className={cn(
                  "aspect-square text-3xl font-black rounded-lg transition-all duration-150",
                  "border border-border/40 hover:border-primary/30 active:scale-95",
                  "disabled:cursor-not-allowed disabled:opacity-80",
                  cell === "X" && "text-info bg-info/5 border-info/20",
                  cell === "O" && "text-error bg-error/5 border-error/20",
                  !cell && !winner && !isDraw && !isAiThinking && "hover:bg-muted/30 hover:shadow-sm",
                  isAiThinking && "cursor-wait",
                )}
              >
                {cell || ""}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <div className={cn(
            "text-sm font-bold py-1.5 px-3 rounded-lg inline-block",
            winner && "text-success bg-success/5",
            isDraw && "text-warning bg-warning/5",
            isAiThinking && "text-muted-foreground bg-muted/20 animate-pulse",
            !winner && !isDraw && !isAiThinking && "text-foreground bg-muted/10",
          )}>
            {winner ? `🎉 ${statusText}` : statusText}
          </div>
        </div>

        <div className="flex gap-2">
          {(winner || isDraw) && (
            <Button onClick={startGame} size="sm" className="flex-1 h-8 text-xs">
              <RotateCcw className="w-3 h-3 mr-1" /> Play Again
            </Button>
          )}
          <Button onClick={resetScores} variant="outline" size="sm" className="h-8 text-xs">
            <RotateCcw className="w-3 h-3 mr-1" /> Reset All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
