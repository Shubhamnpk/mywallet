"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Wallet, ArrowRight, Menu, X, Github } from "lucide-react"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/releases", label: "Releases" },
  { href: "/contributors", label: "Contributors" },
  { href: "/about", label: "About" },
]

export function PublicNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <header className="fixed top-0 inset-x-0 z-30 pt-3 px-3 sm:px-4 pointer-events-none">
      <div
        className={`pointer-events-auto mx-auto max-w-5xl rounded-2xl border transition-all duration-300 ${
          mobileOpen
            ? "border-border/60 bg-background/95 shadow-lg backdrop-blur-xl"
            : "border-border/50 bg-background/75 shadow-md shadow-black/[0.04] backdrop-blur-xl"
        }`}
      >
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
          <Link href="/welcome" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <Wallet className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="text-base font-black tracking-tight sm:text-lg">
              My<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Wallet</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 rounded-full bg-muted/60 p-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                  isActive(link.href)
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/70"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a
              href="https://github.com/Shubhamnpk/mywallet"
              target="_blank"
              rel="noopener noreferrer"
              title="Star on GitHub"
              aria-label="GitHub repository"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
            <Link
              href="/welcome?start=1"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/85 px-4 py-2 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 text-foreground transition-colors hover:bg-muted md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="border-t border-border/60 px-4 py-3 md:hidden">
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
              <a
                href="https://github.com/Shubhamnpk/mywallet"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold text-muted-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
              <Link
                href="/welcome?start=1"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
              >
                Get Started
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
