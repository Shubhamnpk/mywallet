import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how MyWallet helps you track expenses, build budgets, and understand spending using time-based insights.",
  keywords: "how personal finance app works, time-based budgeting, expense tracker workflow, budget planner app",
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How MyWallet Works | Time-Based Budgeting App",
    description: "Learn how MyWallet helps you track expenses, build budgets, and understand spending using time-based insights.",
    url: `${siteUrl}/how-it-works`,
    type: "website",
    siteName: "MyWallet",
    images: [
      { url: "/mywallet.png", width: 1200, height: 630, alt: "How MyWallet works" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How MyWallet Works | Time-Based Budgeting App",
    description: "Learn how MyWallet helps you track expenses, build budgets, and understand spending using time-based insights.",
    images: ["/mywallet.png"],
  },
}

export default function HowItWorksPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "How MyWallet Works",
    url: `${siteUrl}/how-it-works`,
    description: "Step-by-step overview of MyWallet's personal finance workflow.",
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <header className="space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-primary">How It Works</p>
          <h1 className="text-3xl sm:text-4xl font-black">Time-based budgeting made simple</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            MyWallet helps you track expenses, set budgets, and understand your spending in terms of time worked — a clearer way to manage money.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Track",
              description: "Add expenses and income with categories, notes, and recurring schedules.",
            },
            {
              step: "02",
              title: "Budget",
              description: "Set monthly limits, monitor category performance, and stay on track.",
            },
            {
              step: "03",
              title: "Understand",
              description: "See every purchase translated into time and compare trade-offs.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-primary">{item.step}</p>
              <h2 className="text-lg font-bold mt-2">{item.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/50 p-5 space-y-3">
          <h2 className="text-xl font-bold">Why time-based budgeting works</h2>
          <p className="text-sm text-muted-foreground">
            Traditional expense trackers show numbers. MyWallet shows time — helping you understand the real cost of a purchase and align spending with your goals.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>See how many hours a purchase costs</li>
            <li>Compare expenses against income in real time</li>
            <li>Make faster, clearer financial decisions</li>
          </ul>
        </section>

        <section className="flex flex-wrap gap-3">
          <Link href="/features" className="text-sm font-semibold text-primary hover:underline">Explore features</Link>
          <Link href="/guides/time-based-budgeting" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Read the time-based budgeting guide</Link>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  )
}
