"use client"

import { useEffect, useState } from "react"
import {
  Wallet, TrendingUp, Target, Shield, Smartphone, Brain,
  LineChart, Bitcoin, Calculator, Mic, Camera, Clock,
  LockKeyhole, Cloud, PiggyBank, BarChart3, Receipt,
  Sparkles, ArrowRight, GanttChart, Search,
  RefreshCw, Download, Sun, Puzzle, LayoutDashboard, UserCheck,
  ScrollText, Eye, BellRing, Cog, Dock, Star,
} from "lucide-react"
import Link from "next/link"

interface Feature {
  icon: typeof Wallet
  title: string
  desc: string
  popular?: boolean
}

interface Category {
  id: string
  label: string
  icon: typeof Wallet
  gradient: string
  textColor: string
  features: Feature[]
}

const categories: Category[] = [
  {
    id: "core",
    label: "Core Finance",
    icon: Wallet,
    gradient: "from-emerald-500 to-teal-500",
    textColor: "text-emerald-500",
    features: [
      { icon: Wallet, title: "Expense Tracking", desc: "Log and categorize daily expenses with an intuitive interface. Filter, search, and analyze every transaction. Supports multiple payment methods and currencies.", popular: true },
      { icon: PiggyBank, title: "Budget Management", desc: "Set monthly spending limits per category. Real-time progress bars with smart alerts at 80% threshold. Subcategory budgets and emergency reserve support." },
      { icon: Target, title: "Goal Tracking", desc: "Set financial goals with target amounts and dates. Auto-contributions, progress velocity tracking, and gamified savings challenges with points and penalties." },
      { icon: Receipt, title: "Debt & Credit", desc: "Track loans, credit cards with payment scheduling and interest calculations. Avalanche and snowball payoff insights to optimize your repayment strategy." },
      { icon: Brain, title: "Smart Advisor", desc: "AI-powered insights budget warnings, anomaly detection, lifestyle creep flags, emergency fund vulnerability, and no-spend streak tracking with rewards.", popular: true },
      { icon: BarChart3, title: "Financial Health", desc: "Comprehensive wellness score (0-100) with letter grade. Savings rate, net worth, spending trends, and scenario planning. Exportable reports." },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio & Market",
    icon: TrendingUp,
    gradient: "from-blue-500 to-indigo-500",
    textColor: "text-blue-500",
    features: [
      { icon: TrendingUp, title: "NEPSE Integration", desc: "Real-time Nepali stock data, company profiles and financial statements. Sector analysis, top rankings, and broker leaderboard with podium view.", popular: true },
      { icon: LineChart, title: "Portfolio Tracking", desc: "Multi-portfolio for stocks and crypto with P&L calculations, heatmap visualization, valuation timelines, and dividend what-if planning." },
      { icon: Bitcoin, title: "Crypto Markets", desc: "Track popular coins via Coinlore API. Crypto portfolio alongside stocks, market news, and symbol resolution for comprehensive market view." },
      { icon: GanttChart, title: "SIP Automation", desc: "Systematic Investment Plans with due date calculations, carryover logic for missed contributions, and automatic transaction enrollment." },
      { icon: Search, title: "MeroShare IPO", desc: "Automated IPO applications through MeroShare integration. DPS management, upcoming IPO notifications, and detailed company information modals." },
      { icon: RefreshCw, title: "Currency Converter", desc: "Live exchange rates across 21 currencies including USD, NPR, INR, EUR, GBP, and more. Rate caching and swap with one tap.", popular: true },
    ],
  },
  {
    id: "security",
    label: "Security & Privacy",
    icon: Shield,
    gradient: "from-violet-500 to-purple-500",
    textColor: "text-violet-500",
    features: [
      { icon: LockKeyhole, title: "Biometric Auth", desc: "WebAuthn-based fingerprint and face recognition for instant, secure access. Works across all supported devices and browsers.", popular: true },
      { icon: Shield, title: "PIN Protection", desc: "AES-256-GCM encrypted PIN with emergency duress mode. PIN-enabled toggle, change flow, and session timeout controls." },
      { icon: Eye, title: "Privacy Controls", desc: "Balance privacy toggle to hide amounts. Full data export and import. Session timeout with auto-lock on inactivity." },
      { icon: UserCheck, title: "Security Audit", desc: "Built-in security audit tool with vulnerability detection. Session validation, event logging, and debug panel for advanced users." },
    ],
  },
  {
    id: "sync",
    label: "Sync & Storage",
    icon: Cloud,
    gradient: "from-amber-500 to-orange-500",
    textColor: "text-amber-500",
    features: [
      { icon: Cloud, title: "Dropbox Backup", desc: "Secure OAuth2 PKCE-based cloud sync. Selective import/export modes, tombstone sync for deleted records, and encrypted backups with PIN.", popular: true },
      { icon: Download, title: "Data Management", desc: "Full JSON backup export, import from backup, and complete data reset with full state cleanup including portfolios and market data." },
      { icon: Smartphone, title: "PWA & Offline", desc: "Full offline mode via service worker. Install on any device desktop, tablet, or mobile. Push notifications and auto-updates included." },
      { icon: Dock, title: "Browser Extension", desc: "Chrome and Firefox companion extension. Bi-directional wallet state sync and page interaction via extension bridge protocol." },
    ],
  },
  {
    id: "tools",
    label: "Productivity Tools",
    icon: Calculator,
    gradient: "from-pink-500 to-rose-500",
    textColor: "text-pink-500",
    features: [
      { icon: Calculator, title: "Floating Calculator", desc: "Multi-instance draggable calculator with tabbed history. Screen-edge snapping, keyboard support, and one-tap amount prefilling for transactions.", popular: true },
      { icon: Mic, title: "Voice Recognition", desc: "Speak transactions naturally  'spent $50 at restaurant' auto-detects type, category, and amount using speech-to-text parsing." },
      { icon: Camera, title: "Receipt Scanner", desc: "OCR-powered scanning with Tesseract.js. Automatic merchant, amount, date extraction and category auto-detection from receipt text." },
      { icon: Clock, title: "Shift Tracker", desc: "Log work shifts with start/end times, breaks, and pay rates. Generate reports and view expenses as hours of work time." },
      { icon: BellRing, title: "Bill Reminders", desc: "Recurring and one-time reminders for rent, electricity, water, internet, insurance, subscriptions, and more. Configurable advance notice." },
      { icon: Sparkles, title: "Quick Actions", desc: "Floating action button for instant access scan, voice entry, calculator, currency converter, shift log, games, and wallet lock.", popular: true },
    ],
  },
  {
    id: "ux",
    label: "Dashboard & UX",
    icon: LayoutDashboard,
    gradient: "from-cyan-500 to-sky-500",
    textColor: "text-cyan-500",
    features: [
      { icon: LayoutDashboard, title: "Smart Dashboard", desc: "Combined balance card with income/expense summary, time equivalent view, privacy toggle, and change animations.", popular: true },
      { icon: ScrollText, title: "Tab Navigation", desc: "Dedicated tabs for transactions, budgets, goals, debt, categories, portfolio, insights, shift tracker, broker leaderboard, and scanner." },
      { icon: Cog, title: "Full Settings", desc: "Profile, security, theme, notifications, MeroShare, data management, accessibility, and developer tools. Everything configurable." },
      { icon: Sun, title: "Theme Customization", desc: "Light, dark, and system theme modes. Customizable appearance with accent colors and responsive design across all screen sizes." },
      { icon: Puzzle, title: "Onboarding Flow", desc: "Guided new user setup with returning user detection, welcome-back card, feature carousel, and smooth step-by-step configuration." },
      { icon: Smartphone, title: "Cross-Platform", desc: "Same experience on desktop, tablet, and mobile via PWA. No app store needed. Works on Chrome, Safari, Firefox, and Edge." },
    ],
  },
]

export function FeaturesPageClient() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="relative">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/4 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div
          className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-3xl"
          style={{ transform: `translate(-50%, -50%) scale(${1 + scrollY * 0.0003})` }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* ── Hero ── */}
        <section className="grid md:grid-cols-2 gap-10 md:gap-16 items-center pt-8">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Everything in MyWallet
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              Powerful features,{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                beautifully simple
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-md">
              From expense tracking to stock market integration  everything you need to manage your finances
              in one elegant, privacy-first app.
            </p>

            <div className="flex items-center gap-3 mt-8">
              <Link
                href="/welcome?start=1"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground text-sm hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-2 rounded-xl bg-secondary text-secondary-foreground border border-border/60 px-6 py-3 font-semibold text-sm hover:bg-muted transition-all duration-300"
              >
                Roadmap
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-4">Quick look</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Wallet, label: "Expenses", desc: "Log & categorize spending" },
                { icon: PiggyBank, label: "Budgets", desc: "Set limits & track progress" },
                { icon: Target, label: "Goals", desc: "Save with purpose" },
                { icon: TrendingUp, label: "Stocks", desc: "NEPSE live data" },
                { icon: Bitcoin, label: "Crypto", desc: "Market tracking" },
                { icon: Shield, label: "Security", desc: "Biometric & PIN" },
                { icon: Cloud, label: "Backup", desc: "Dropbox sync" },
                { icon: Smartphone, label: "Offline", desc: "Works without internet" },
              ].map((chip) => {
                const Icon = chip.icon
                return (
                  <div
                    key={chip.label}
                    className="group flex items-start gap-3 bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-3.5 hover:border-primary/30 hover:bg-card/80 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-card-foreground">{chip.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{chip.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Feature Sections ── */}
        {categories.map((cat) => {
          const CatIcon = cat.icon
          return (
            <section key={cat.id} id={`section-${cat.id}`} className="scroll-mt-28">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg ring-2 ring-background`}>
                  <CatIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-card-foreground">{cat.label}</h2>
                  <p className="text-sm text-muted-foreground">{cat.features.length} features</p>
                </div>
                <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-4" />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.features.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={feature.title}
                      className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-lg overflow-hidden"
                    >
                      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${cat.gradient} opacity-[0.03] rounded-bl-full`} />
                      <div className="relative flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-card-foreground text-sm">{feature.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.desc}</p>
                        </div>
                      </div>
                      {feature.popular && (
                        <div className="absolute top-3 right-3">
                          <Star className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* ── Why Section ── */}
        <section className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-backdrop backdrop-blur-xl rounded-3xl p-8 md:p-14 border border-border/60 shadow-xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Designed for{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">real life</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
              Not just features a finance app that respects your time, privacy, and money.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Shield, title: "Privacy by Design", desc: "Your data stays on your device. No accounts, no servers, no tracking. What you track stays yours." },
                { icon: Smartphone, title: "Offline First", desc: "Works with or without internet. Install as a PWA on any device no app store required." },
                { icon: Clock, title: "Time-Aware", desc: "See every expense in hours of work, not just dollars. A shift in perspective that changes everything." },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="text-center p-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5 shadow-lg">
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-card-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="text-center max-w-2xl mx-auto pb-16">
          <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 backdrop-blur-xl rounded-3xl p-10 md:p-14 border border-primary/20 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start using every feature</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              No hidden costs, no subscriptions, no data selling. Just you and your finances.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/welcome?start=1"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground text-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-2 rounded-xl bg-secondary text-secondary-foreground border border-border/60 px-8 py-4 font-semibold text-lg hover:bg-muted transition-all duration-300"
              >
                View Roadmap
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Free forever · No credit card needed</p>
          </div>
        </section>

      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

      `}</style>
    </div>
  )
}
