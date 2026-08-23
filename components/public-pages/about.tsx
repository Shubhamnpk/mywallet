"use client"

import { Heart, Shield, Globe, Github, Sparkles, Wallet, Target, Zap, Building,
  Code2, Coffee, ExternalLink, Star, Clock, Quote, MapPin, ArrowRight,
  Download, CheckCircle, Users, TrendingUp, Smartphone, Eye
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { PublicBackground } from "./public-background"

const values = [
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your financial data stays on your device by default. Zero-knowledge architecture , what you track stays yours.",
    gradient: "from-emerald-500 to-teal-500",
    stat: "100%",
    statLabel: "On-device storage"
  },
  {
    icon: Clock,
    title: "Time-Aware Finance",
    description: "See every expense in terms of time worked. A coffee is 12 minutes, not $5, the perspective changes how you spend.",
    gradient: "from-blue-500 to-indigo-500",
    stat: "10M+",
    statLabel: "Time conversions"
  },
  {
    icon: Globe,
    title: "Free Forever",
    description: "No hidden fees, no subscriptions, no credit card needed. Premium financial tools should be accessible to everyone.",
    gradient: "from-violet-500 to-purple-500",
    stat: "$0",
    statLabel: "Cost to use"
  },
  {
    icon: Smartphone,
    title: "Offline First",
    description: "Built as a Progressive Web App  works seamlessly with or without internet on any device, anywhere in the world.",
    gradient: "from-amber-500 to-orange-500",
    stat: "100%",
    statLabel: "Offline capable"
  },
]

const milestones = [
  { year: "2024", title: "The Idea", description: "Born from a simple question: why don't finance apps show what your money really costs in time?" },
  { year: "2024", title: "First Prototype", description: "Built the first working version with core expense tracking and the time-based insight engine." },
  { year: "2025", title: "Public Launch", description: "Released to the public as a free PWA. Open-sourced the entire codebase on GitHub." },
  { year: "2026", title: "Growing Community", description: "10,000+ active users, 50+ countries, continuous improvements driven by real feedback." },
]

const stats = [
  { icon: Users, value: "10K+", label: "Active Users" },
  { icon: TrendingUp, value: "$2.5M+", label: "Money Saved" },
  { icon: Star, value: "4.9", label: "App Rating" },
  { icon: Globe, value: "50+", label: "Countries" },
]

export function AboutPageClient() {
  return (
    <div className="relative">
      {/* Static background */}
      <PublicBackground />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-32">

        {/* ── Hero ── */}
        <section className="text-center max-w-4xl mx-auto pt-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in">
            <Heart className="w-4 h-4" />
            About MyWallet
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Smart financial tools,{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              built with purpose
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            MyWallet was created to make personal finance intuitive, private, and accessible.
            We believe understanding your money should not require a degree , just the right tools.
          </p>
        </section>

        {/* ── Stats Strip ── */}
        <section className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="group relative bg-card/60 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-border/60 text-center hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-card-foreground mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Story / Mission ── */}
        <section className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Our Story
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                From an idea in{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Nepal</span>
                {" "}to a global tool
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  MyWallet started as a personal project a frustration with existing finance apps that were either
                  too complex, too expensive, or too invasive. The goal was simple: build something that actually helps
                  people understand their money without selling their data.
                </p>
                <p>
                  What began as a side project grew into a tool used by thousands across 50+ countries. Every feature
                  is built with real feedback from real users, keeping privacy and simplicity at the core.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-2xl" />
              <div className="relative bg-card/50 backdrop-blur-sm rounded-3xl p-8 border border-border shadow-2xl">
                <Quote className="w-8 h-8 text-primary/40 mb-4" />
                <blockquote className="text-xl md:text-2xl font-semibold italic leading-relaxed text-card-foreground">
                  &ldquo;Empower everyone to take control of their financial future through elegant, time-aware tools
                  that make money management feel natural not overwhelming.&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-4 pt-6 border-t border-border/60">
                  <Image src="https://avatars.githubusercontent.com/u/150024127" alt="Shubham Niraula" width={48} height={48} className="rounded-full" />
                  <div>
                    <p className="font-semibold text-card-foreground">Shubham Niraula</p>
                    <p className="text-sm text-muted-foreground">Creator of MyWallet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              The <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">journey</span> so far
            </h2>
            <p className="text-lg text-muted-foreground">From idea to impact the milestones that shaped MyWallet.</p>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-accent to-primary/20 hidden md:block" />
            <div className="space-y-10">
              {milestones.map((m, i) => (
                <div key={i} className="relative md:pl-20">
                  <div className="hidden md:flex absolute left-4 top-1 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent items-center justify-center shadow-lg ring-4 ring-background">
                    <div className="w-3 h-3 bg-background rounded-full" />
                  </div>
                  <div className="bg-card/60 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-border/60 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">{m.year}</span>
                      <span className="h-px flex-1 bg-border/60" />
                    </div>
                    <h3 className="text-xl font-bold text-card-foreground mb-2">{m.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              What we <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">stand for</span>
            </h2>
            <p className="text-lg text-muted-foreground">Four principles that guide every line of code we write.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value) => {
              const Icon = value.icon
              return (
                <div
                  key={value.title}
                  className="group relative bg-card/60 backdrop-blur-sm rounded-2xl p-8 border border-border/60 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${value.gradient} opacity-[0.03] rounded-bl-full`} />
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-card-foreground mb-3">{value.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-primary">{value.stat}</div>
                        <div className="text-xs text-muted-foreground">{value.statLabel}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Why MyWallet ── */}
        <section className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-background backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-border/60 shadow-xl">
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Why{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">MyWallet</span>
                ?
              </h2>
              <p className="text-lg text-muted-foreground">What makes us different from every other finance app.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Eye, title: "Radical Transparency", desc: "Open source code, clear privacy policy, no hidden algorithms. You see exactly how your data is handled." },
                { icon: Clock, title: "Time-Based Insights", desc: "Not just numbers every expense is shown in hours of work. A perspective shift that changes spending habits." },
                { icon: Download, title: "Works Everywhere", desc: "No app store needed. Install as a PWA on any device and use it offline. No downloads, no updates to manage." },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="text-center p-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5">
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-card-foreground mb-3">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Creator ── */}
        <section className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Crafted by <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">one developer</span>
            </h2>
            <p className="text-lg text-muted-foreground">A one-person mission to make financial literacy accessible to everyone.</p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {/* Profile card */}
            <div className="md:col-span-2 bg-card/60 backdrop-blur-sm rounded-2xl p-8 border border-border/60 hover:border-primary/30 transition-all duration-300 hover:shadow-xl text-center">
              <div className="relative inline-block mb-5">
                <Image src="https://avatars.githubusercontent.com/u/150024127" alt="Shubham Niraula" width={112} height={112} className="rounded-full mx-auto shadow-xl ring-4 ring-background" />
                <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-500 border-[3px] border-background flex items-center justify-center shadow-lg">
                  <Heart className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-card-foreground">Shubham Niraula</h3>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nepal</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                  <Code2 className="w-3 h-3" />
                  Full-stack Dev
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-medium">
                  <Coffee className="w-3 h-3" />
                  Open Source
                </span>
              </div>
              <div className="mt-6 pt-6 border-t border-border/40">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-lg font-bold text-primary">10K+</div>
                    <div className="text-xs text-muted-foreground">Users reached</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-lg font-bold text-primary">1</div>
                    <div className="text-xs text-muted-foreground">Person team</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio + philosophy */}
            <div className="md:col-span-3 space-y-4">
              <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-8 border border-border/60 hover:border-primary/30 transition-all duration-300 hover:shadow-xl h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Quote className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-card-foreground">The vision behind MyWallet</p>
                    <p className="text-xs text-muted-foreground">Building with purpose, one feature at a time</p>
                  </div>
                </div>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    MyWallet started as a personal frustration every finance app was either too complex,
                    too expensive, or too invasive. So I built my own.
                  </p>
                  <p>
                    Every feature begins with one question: <span className="text-foreground font-medium">&ldquo;Would this actually help someone make better decisions?&rdquo;</span>
                    If the answer is no, it does not ship.
                  </p>
                  <p>
                    From Nepal to 50+ countries, what started as a side project is now used by thousands.
                    No investors, no ads, no data selling just useful software built in the open.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="https://github.com/Shubhamnpk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    @Shubhamnpk
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Open Source ── */}
        <section className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl shadow-xl">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-primary/10 to-transparent rounded-full" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-accent/10 to-transparent rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-8 items-center p-8 md:p-12">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-5">
                  <Github className="w-4 h-4" />
                  Open Source
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Built in the{" "}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">open</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-md">
                  Every line of code is publicly available on GitHub. We believe transparency builds trust
                  and great software is built together, not behind closed doors.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <Link
                    href="https://github.com/Shubhamnpk/mywallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <Github className="w-5 h-5" />
                    View on GitHub
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <Link
                    href="https://github.com/Shubhamnpk/mywallet/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-secondary text-secondary-foreground border border-border/60 px-6 py-3.5 font-semibold hover:bg-muted transition-all duration-300"
                  >
                    Report an Issue
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border border-border/60 font-mono text-xs leading-relaxed shadow-inner">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-muted-foreground ml-2">mywallet | MIT License</span>
                  </div>
                  <div>
                    <p><span className="text-primary">import</span> <span className="text-accent">{'{ Wallet, TrendingUp, Target }'}</span> <span className="text-primary">from</span> <span className="text-emerald-500">'lucide-react'</span></p>
                    <p className="mt-1"><span className="text-primary">import</span> <span className="text-accent">{'{ useState, useEffect }'}</span> <span className="text-primary">from</span> <span className="text-emerald-500">'react'</span></p>
                    <p className="mt-3 text-muted-foreground">{"//"} Built with ❤️ from Nepal</p>
                    <p className="text-muted-foreground">{"//"} Free forever. No data sold. No tracking.</p>
                    <p className="mt-3"><span className="text-primary">export</span> <span className="text-primary">default</span> <span className="text-primary">function</span> <span className="text-accent">MyWallet</span>() {'{'}</p>
                    <p className="ml-4 text-muted-foreground">{"//"} 10K+ users · 50+ countries · 4.9 ★</p>
                    <p className="ml-4"><span className="text-primary">return</span> <span className="text-accent">&lt;App</span> <span className="text-accent">/&gt;</span>;</p>
                    <p>{'}'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Partner + CTA row ── */}
        <section className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-5 gap-6 items-stretch">
            {/* Partner */}
            <div className="md:col-span-2 bg-card/40 backdrop-blur-sm border border-border/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-all duration-300 hover:shadow-md">
              <Building className="w-8 h-8 text-primary mb-3" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Technology partner</p>
              <a
                href="https://bitnepal.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                BitNepal
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
              <p className="text-xs text-muted-foreground mt-2">Nepal-based tech community</p>
            </div>

            {/* Final CTA */}
            <div className="md:col-span-3 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 backdrop-blur-xl rounded-2xl p-8 border border-primary/20 shadow-lg flex flex-col items-center justify-center text-center hover:shadow-xl transition-all duration-300">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to take control?</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Join thousands of users worldwide. No credit card needed ever.
              </p>
              <Link
                href="/welcome?start=1"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-semibold text-primary-foreground text-base hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-muted-foreground mt-3">Free forever · No strings attached</p>
            </div>
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
