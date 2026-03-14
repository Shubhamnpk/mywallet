import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export const metadata: Metadata = {
  title: "Time-Based Budgeting Guide",
  description: "Learn time-based budgeting: translate expenses into time worked to make smarter money decisions.",
  keywords: "time based budgeting, time cost of money, expense tracker time, personal finance guide",
  alternates: {
    canonical: "/guides/time-based-budgeting",
  },
  openGraph: {
    title: "Time-Based Budgeting Guide | MyWallet",
    description: "Learn time-based budgeting: translate expenses into time worked to make smarter money decisions.",
    url: `${siteUrl}/guides/time-based-budgeting`,
    type: "article",
    siteName: "MyWallet",
    images: [
      { url: "/mywallet.png", width: 1200, height: 630, alt: "Time-based budgeting guide" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Time-Based Budgeting Guide | MyWallet",
    description: "Learn time-based budgeting: translate expenses into time worked to make smarter money decisions.",
    images: ["/mywallet.png"],
  },
}

export default function TimeBasedBudgetingGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-primary">Guide</p>
          <h1 className="text-3xl sm:text-4xl font-black">Time-Based Budgeting: A Practical Guide</h1>
          <p className="text-base text-muted-foreground">
            Time-based budgeting shows the real cost of purchases by converting money into hours worked. It makes spending decisions clearer and faster.
          </p>
        </header>

        <section className="space-y-4 text-sm text-muted-foreground">
          <p>
            Start by defining your hourly rate. If you make NPR 30,000 per month and work 160 hours, your time value is NPR 187.5 per hour.
          </p>
          <p>
            Every expense becomes time. A NPR 1,000 purchase is ~5.3 hours of work. This makes trade-offs obvious and helps reduce impulse spending.
          </p>
          <p>
            MyWallet automates this calculation so your expense tracker always shows money and time together.
          </p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <h2 className="text-lg font-bold">Quick steps to get started</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>1. Set your monthly income and working hours.</li>
            <li>2. Track expenses as usual.</li>
            <li>3. Review time cost alongside money cost.</li>
          </ol>
        </section>

        <div className="flex gap-3">
          <Link href="/guides" className="text-sm font-semibold text-primary hover:underline">Back to guides</Link>
          <Link href="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Try MyWallet</Link>
        </div>
      </div>
    </div>
  )
}
