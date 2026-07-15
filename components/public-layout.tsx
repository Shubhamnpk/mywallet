import type { ReactNode } from "react"
import { PublicNav } from "./public-nav"
import { PublicFooter } from "./public-footer"

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <PublicNav />
      <main className="relative z-10">{children}</main>
      <PublicFooter />
    </div>
  )
}
