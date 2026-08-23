"use client"

import Link from "next/link"
import { Wallet, Github, Heart, ExternalLink, ArrowUp, Building, Tag } from "lucide-react"
import packageJson from "../../package.json"

const productLinks = [
  { href: "/features", label: "Features" },
  { href: "/welcome#how-it-works", label: "How it works" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/releases", label: "Release notes" },
  { href: "/contributors", label: "Contributors" },
  { href: "/about", label: "About" },
]

const startLinks = [
  { href: "/welcome?start=1", label: "Get Started" },
  { href: "/", label: "Dashboard" },
  { href: "/settings?tab=about", label: "App Info" },
]

const socialLinks = [
  {
    href: "https://github.com/Shubhamnpk/mywallet",
    label: "GitHub",
    icon: Github,
  },
  {
    href: "https://bitnepal.net",
    label: "BitNepal",
    icon: Building,
  },
]

export function PublicFooter() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <footer className="relative border-t border-border/60 bg-card/70 backdrop-blur-xl overflow-hidden">
      {/* Gradient accents */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main grid */}
        <div className="py-14">
          
          <div className="grid gap-10 md:grid-cols-6">
            {/* Brand - wider */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 ring-1 ring-primary/10">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <span className="text-2xl font-bold">MyWallet</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
                Time-aware personal finance app to track spending, manage budgets, and stay in control across devices.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3">
                {socialLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/50 hover:bg-muted rounded-lg px-3 py-2"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Product links */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-4">Product</h3>
              <ul className="space-y-3">
                {productLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Start links */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-4">Get started</h3>
              <ul className="space-y-3">
                {startLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mini CTA */}
            <div className="md:col-span-1">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-4">From Nepal</h3>
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 border border-border/60 text-center">
                <Heart className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Built with passion in Nepal. Free forever.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-border/40 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
            <span>© 2026 MyWallet. All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-primary" /> in Nepal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/releases"
              title="View release notes"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:border-primary/50 hover:bg-primary/10"
            >
              <Tag className="h-3 w-3" />
              v{packageJson.version}
            </Link>
            <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/roadmap" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Roadmap
            </Link>
            <Link href="/releases" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Releases
            </Link>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/50 hover:bg-muted rounded-lg px-3 py-1.5"
            >
              Back to top
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
