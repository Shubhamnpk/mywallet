"use client"

import React, { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Play, Cpu, Users } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface TicTacToeGameProps {
  isOpen: boolean
  onClose: () => void
}

type Player = 'X' | 'O' | null
type Board = Player[]
type GameMode = 'human' | 'ai'
type Difficulty = 'normal' | 'infinity'

interface GameState {
  board: Board
  currentPlayer: Player
  winner: Player
  isDraw: boolean
  gameMode: GameMode
  difficulty: Difficulty
  isPlaying: boolean
  scores: { X: number; O: number; draws: number }
}

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6] // diagonals
]

export function TicTacToeGame({ isOpen, onClose }: TicTacToeGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null,
    isDraw: false,
    gameMode: 'human',
    difficulty: 'normal',
    isPlaying: false,
    scores: { X: 0, O: 0, draws: 0 }
  })

  const checkWinner = useCallback((board: Board): Player => {
    for (const combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]
      }
    }
    return null
  }, [])

  const isBoardFull = useCallback((board: Board): boolean => {
    return board.every(cell => cell !== null)
  }, [])

  const getBestMove = useCallback((board: Board): number => {
    // Simple AI: try to win, block opponent, or take center/corners
    const opponent = gameState.currentPlayer === 'X' ? 'O' : 'X'

    // Check if AI can win
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        const testBoard = [...board]
        testBoard[i] = gameState.currentPlayer
        if (checkWinner(testBoard) === gameState.currentPlayer) {
          return i
        }
      }
    }

    // Check if AI needs to block opponent
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        const testBoard = [...board]
        testBoard[i] = opponent
        if (checkWinner(testBoard) === opponent) {
          return i
        }
      }
    }

    // Take center if available
    if (board[4] === null) return 4

    // Take corners
    const corners = [0, 2, 6, 8]
    for (const corner of corners) {
      if (board[corner] === null) return corner
    }

    // Take any available spot
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) return i
    }

    return -1
  }, [gameState.currentPlayer, checkWinner])

  const makeMove = useCallback((index: number) => {
    if (gameState.board[index] || gameState.winner || gameState.isDraw) return

    const newBoard = [...gameState.board]
    newBoard[index] = gameState.currentPlayer

    const winner = checkWinner(newBoard)
    const isDraw = !winner && isBoardFull(newBoard)

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentPlayer: prev.currentPlayer === 'X' ? 'O' : 'X',
      winner,
      isDraw
    }))

    // AI move for human vs AI mode
    if (gameState.gameMode === 'ai' && !winner && !isDraw && gameState.currentPlayer === 'X') {
      setTimeout(() => {
        const aiMove = getBestMove(newBoard)
        if (aiMove !== -1) {
          const aiBoard = [...newBoard]
          aiBoard[aiMove] = 'O'

          const aiWinner = checkWinner(aiBoard)
          const aiIsDraw = !aiWinner && isBoardFull(aiBoard)

          setGameState(prev => ({
            ...prev,
            board: aiBoard,
            currentPlayer: 'X',
            winner: aiWinner,
            isDraw: aiIsDraw
          }))
        }
      }, 500)
    }
  }, [gameState.board, gameState.currentPlayer, gameState.winner, gameState.isDraw, gameState.gameMode, checkWinner, isBoardFull, getBestMove])

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      isDraw: false,
      isPlaying: true
    }))
  }, [])

  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      isDraw: false,
      isPlaying: false
    }))
  }, [])

  const resetScores = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      scores: { X: 0, O: 0, draws: 0 }
    }))
  }, [])

  const toggleGameMode = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gameMode: prev.gameMode === 'human' ? 'ai' : 'human'
    }))
  }, [])

  const toggleDifficulty = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      difficulty: prev.difficulty === 'normal' ? 'infinity' : 'normal'
    }))
  }, [])

  // Update scores when game ends
  React.useEffect(() => {
    if (gameState.winner || gameState.isDraw) {
      setGameState(prev => ({
        ...prev,
        scores: {
          ...prev.scores,
          [gameState.winner || 'draws']: prev.scores[gameState.winner || 'draws'] + 1
        }
      }))

      if (gameState.winner) {
        toast.success(`${gameState.winner} wins!`)
      } else if (gameState.isDraw) {
        toast.info("It's a draw!")
      }
    }
  }, [gameState.winner, gameState.isDraw])

  if (!isOpen) return null

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-success" />
            Tic Tac Toe
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Game Settings */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Mode:</span>
            <Badge
              variant={gameState.gameMode === 'human' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={toggleGameMode}
            >
              {gameState.gameMode === 'human' ? (
                <>
                  <Users className="w-3 h-3 mr-1" />
                  Human vs Human
                </>
              ) : (
                <>
                  <Cpu className="w-3 h-3 mr-1" />
                  Human vs AI
                </>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Type:</span>
            <Badge
              variant={gameState.difficulty === 'normal' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={toggleDifficulty}
            >
              {gameState.difficulty === 'normal' ? 'Normal' : 'Infinity'}
            </Badge>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-info">{gameState.scores.X}</div>
            <div className="text-xs text-muted-foreground">Player X</div>
          </div>
          <div>
            <div className="text-lg font-bold text-muted-foreground">{gameState.scores.draws}</div>
            <div className="text-xs text-muted-foreground">Draws</div>
          </div>
          <div>
            <div className="text-lg font-bold text-error">{gameState.scores.O}</div>
            <div className="text-xs text-muted-foreground">
              {gameState.gameMode === 'ai' ? 'AI' : 'Player O'}
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-2 w-full max-w-64 h-auto mx-auto bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-2xl border-2 border-border">
            {gameState.board.map((cell, index) => (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  "aspect-square text-4xl font-bold h-full rounded-xl transition-all duration-200",
                  "hover:bg-white/80 hover:scale-105 active:scale-95",
                  "border-2 border-border/80 hover:border-primary/20",
                  cell === 'X' && "text-info hover:text-info/90",
                  cell === 'O' && "text-error hover:text-error/90",
                  "disabled:cursor-not-allowed disabled:hover:scale-100"
                )}
                onClick={() => makeMove(index)}
                disabled={!!cell || !!gameState.winner || gameState.isDraw || (gameState.gameMode === 'ai' && gameState.currentPlayer === 'O')}
              >
                {cell && (
                  <span className={cn(
                    "drop-shadow-sm",
                    cell === 'X' && "text-info",
                    cell === 'O' && "text-error"
                  )}>
                    {cell}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Game Status */}
        <div className="text-center space-y-2">
          {gameState.winner ? (
            <div className="space-y-2">
              <div className="text-2xl">🎉</div>
              <div className="text-xl font-bold text-success">
                {gameState.winner === 'X' ? 'Player X' : gameState.gameMode === 'ai' && gameState.winner === 'O' ? 'AI' : 'Player O'} Wins!
              </div>
              <div className="text-sm text-muted-foreground">
                Great game! 🎮
              </div>
            </div>
          ) : gameState.isDraw ? (
            <div className="space-y-2">
              <div className="text-2xl">🤝</div>
              <div className="text-xl font-bold text-warning">
                It's a Draw!
              </div>
              <div className="text-sm text-muted-foreground">
                Well played both sides! ⚖️
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {gameState.gameMode === 'ai' && gameState.currentPlayer === 'O' ? (
                <div className="flex items-center justify-center gap-2 text-lg font-medium">
                  <Cpu className="w-5 h-5 animate-pulse" />
                  AI is thinking...
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-lg font-medium">
                    Player {gameState.currentPlayer}'s Turn
                  </div>
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                    gameState.currentPlayer === 'X' ? "bg-info/10 text-info" : "bg-error/10 text-error"
                  )}>
                    <span className="text-lg">{gameState.currentPlayer}</span>
                    <span>Turn</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!gameState.isPlaying && (
            <Button onClick={startGame} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          )}

          {(gameState.winner || gameState.isDraw) && gameState.difficulty === 'normal' && (
            <Button onClick={startGame} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Next Round
            </Button>
          )}

          <Button onClick={resetGame} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Board
          </Button>
        </div>

        <Button onClick={resetScores} variant="outline" size="sm" className="w-full">
          Reset Scores
        </Button>
      </CardContent>
    </Card>
  )
}