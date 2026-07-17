"use client"

import { useState } from "react"
import { Gamepad2, Home, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PingPongGame } from "@/components/ui/ping-pong-game"
import { TicTacToeGame } from "@/components/ui/tic-tac-toe-game"

type GameType = "pingpong" | "tictactoe" | "menu"

export function GamesTool() {
  const [selectedGame, setSelectedGame] = useState<GameType>("menu")

  const games = [
    { id: "pingpong" as GameType, name: "Ping Pong", icon: <Home className="w-5 h-5" />, description: "Classic paddle game" },
    { id: "tictactoe" as GameType, name: "Tic Tac Toe", icon: <Users className="w-5 h-5" />, description: "Strategy game with AI" },
  ]

  if (selectedGame !== "menu") {
    return (
      <div>
        {selectedGame === "pingpong" ? (
          <PingPongGame isOpen={true} onClose={() => setSelectedGame("menu")} />
        ) : (
          <TicTacToeGame isOpen={true} onClose={() => setSelectedGame("menu")} />
        )}
      </div>
    )
  }

  return (
    <Card className="bg-card/45 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl">
      <CardHeader className="pb-2 px-4 pt-3 border-b border-border/10">
        <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5 text-primary" /> Gaming Place
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🎮</div>
          <h3 className="text-lg font-bold mb-1">Gaming Place</h3>
          <p className="text-xs text-muted-foreground">Choose your game and start playing!</p>
        </div>
        <div className="grid gap-2">
          {games.map((game) => (
            <Button
              key={game.id}
              variant="outline"
              className="h-auto p-3 flex items-center gap-3 hover:bg-primary/5"
              onClick={() => setSelectedGame(game.id)}
            >
              <div className="text-primary">{game.icon}</div>
              <div className="text-left">
                <div className="font-semibold text-sm">{game.name}</div>
                <div className="text-[10px] text-muted-foreground">{game.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
