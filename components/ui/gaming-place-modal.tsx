"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TravelMiniGame } from "./travel-mini-game"
import { PingPongGame } from "./ping-pong-game"
import { TicTacToeGame } from "./tic-tac-toe-game"
import { Plane, Home, Users } from "lucide-react"

interface GamingPlaceModalProps {
  isOpen: boolean
  onClose: () => void
}

type GameType = 'travel' | 'pingpong' | 'tictactoe' | 'menu'

export function GamingPlaceModal({ isOpen, onClose }: GamingPlaceModalProps) {
  const [selectedGame, setSelectedGame] = useState<GameType>('menu')
  const [showMenu, setShowMenu] = useState(true)

  if (!isOpen) return null

  const games = [
    {
      id: 'travel' as GameType,
      name: 'Travel Quest',
      icon: <Plane className="w-5 h-5" />,
      description: 'Visit destinations around the world'
    },
    {
      id: 'pingpong' as GameType,
      name: 'Ping Pong',
      icon: <Home className="w-5 h-5" />,
      description: 'Classic paddle game'
    },
    {
      id: 'tictactoe' as GameType,
      name: 'Tic Tac Toe',
      icon: <Users className="w-5 h-5" />,
      description: 'Strategy game with AI'
    }
  ]

  const handleGameSelect = (gameId: GameType) => {
    setSelectedGame(gameId)
    setShowMenu(false)
  }

  const handleBackToMenu = () => {
    setSelectedGame('menu')
    setShowMenu(true)
  }

  const renderGame = () => {
    switch (selectedGame) {
      case 'travel':
        return <TravelMiniGame isOpen={true} onClose={onClose} />
      case 'pingpong':
        return <PingPongGame isOpen={true} onClose={onClose} />
      case 'tictactoe':
        return <TicTacToeGame isOpen={true} onClose={onClose} />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md mx-auto">
        {showMenu ? (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  🎮 Gaming Place
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🎮</div>
                <h3 className="text-xl font-bold mb-2">Gaming Place</h3>
                <p className="text-sm text-muted-foreground">
                  Choose your game and start playing!
                </p>
              </div>

              <div className="grid gap-3">
                {games.map((game) => (
                  <Button
                    key={game.id}
                    variant="outline"
                    className="h-auto p-4 flex items-center gap-3 hover:bg-primary/5"
                    onClick={() => handleGameSelect(game.id)}
                  >
                    <div className="text-blue-500">
                      {game.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{game.name}</div>
                      <div className="text-xs text-muted-foreground">{game.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="absolute -top-12 left-0 z-10 bg-background/80 backdrop-blur-sm"
              onClick={handleBackToMenu}
            >
              ← Back to Menu
            </Button>
            {renderGame()}
          </div>
        )}
      </div>
    </div>
  )
}