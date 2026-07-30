import Link from "next/link"
import { Wallet, ArrowRight } from "lucide-react"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/releases", label: "Releases" },
  { href: "/about", label: "About" },
]

export function PublicNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/welcome" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">MyWallet</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/welcome?start=1"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
