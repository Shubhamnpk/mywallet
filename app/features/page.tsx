import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export const metadata: Metadata = {
  title: "Features",
  description: "Explore MyWallet features: expense tracking, budget management, time-based insights, goals, and offline support. The personal finance app built for smarter money decisions.",
  keywords: "personal finance app features, budget tracker features, expense tracker features, time-based budgeting, offline finance app, money management tools",
  alternates: {
    canonical: "/features",
  },
  openGraph: {
    title: "MyWallet Features | Smart Personal Finance App",
    description: "Explore MyWallet features: expense tracking, budget management, time-based insights, goals, and offline support.",
    url: `${siteUrl}/features`,
    type: "website",
    siteName: "MyWallet",
    images: [
      { url: "/mywallet.png", width: 1200, height: 630, alt: "MyWallet features preview" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyWallet Features | Smart Personal Finance App",
    description: "Explore MyWallet features: expense tracking, budget management, time-based insights, goals, and offline support.",
    images: ["/mywallet.png"],
  },
}

export default function FeaturesPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "MyWallet Features",
    url: `${siteUrl}/features`,
    description: "Feature overview of the MyWallet personal finance app.",
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <header className="space-y-4 text-left">
          <p className="text-xs font-black uppercase tracking-widest text-primary">MyWallet Features</p>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            The personal finance app that turns money into time and insight
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Track expenses, set budgets, and measure progress with a time-based budgeting model that helps you understand the real cost of every purchase.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/welcome" className="text-sm font-semibold text-primary hover:underline">Get started</Link>
            <Link href="/how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground">How it works</Link>
            <Link href="/security" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Security</Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Expense Tracking",
              description: "Log income and expenses with categories, tags, and recurring entries. See your spending trends clearly.",
            },
            {
              title: "Budget Management",
              description: "Set monthly budgets, track category limits, and get alerts before you overspend.",
            },
            {
              title: "Time-Based Insights",
              description: "Translate spending into time worked so every purchase is easier to understand and compare.",
            },
            {
              title: "Goals & Debt",
              description: "Set savings goals and manage debt with payoff strategies and progress tracking.",
            },
            {
              title: "Offline First",
              description: "Your data is available even without internet, with PWA support for mobile use.",
            },
            {
              title: "Privacy & Security",
              description: "Local encryption, optional PIN, and privacy mode keep your financial data safe.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-left">
          <h2 className="text-xl font-bold">Built for smarter money decisions</h2>
          <p className="text-sm text-muted-foreground mt-2">
            MyWallet combines budget tracking, expense management, and time-based insights into a single personal finance app designed for clarity and control.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/pricing" className="text-sm font-bold text-primary hover:underline">See pricing</Link>
            <Link href="/guides" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Read guides</Link>
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  )
}
