import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export const metadata: Metadata = {
  title: "Expense Tracker Tips for Nepal",
  description: "Learn how to build a strong expense tracking habit with a simple system and daily routine.",
  keywords: "expense tracker Nepal, best expense tracker, expense tracking habits, money management Nepal",
  alternates: {
    canonical: "/guides/expense-tracker-nepal",
  },
  openGraph: {
    title: "Expense Tracker Tips for Nepal | MyWallet Guide",
    description: "Learn how to build a strong expense tracking habit with a simple system and daily routine.",
    url: `${siteUrl}/guides/expense-tracker-nepal`,
    type: "article",
    siteName: "MyWallet",
    images: [
      { url: "/mywallet.png", width: 1200, height: 630, alt: "Expense tracker Nepal guide" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Expense Tracker Tips for Nepal | MyWallet Guide",
    description: "Learn how to build a strong expense tracking habit with a simple system and daily routine.",
    images: ["/mywallet.png"],
  },
}

export default function ExpenseTrackerNepalGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-primary">Guide</p>
          <h1 className="text-3xl sm:text-4xl font-black">Best Expense Tracker Tips for Nepal</h1>
          <p className="text-base text-muted-foreground">
            Track spending consistently by keeping the system simple, fast, and easy to review weekly.
          </p>
        </header>

        <section className="space-y-4 text-sm text-muted-foreground">
          <p>
            The best expense tracker is the one you use daily. Keep categories minimal: Food, Transport, Bills, Savings, and Misc.
          </p>
          <p>
            Log expenses the same day. A short daily habit makes monthly reviews accurate.
          </p>
          <p>
            MyWallet helps you log quickly and shows clear summaries without extra work.
          </p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <h2 className="text-lg font-bold">Quick habit plan</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Track expenses right after payment</li>
            <li>Set weekly review reminders</li>
            <li>Use time-based insights to cut waste</li>
          </ul>
        </section>

        <div className="flex gap-3">
          <Link href="/guides" className="text-sm font-semibold text-primary hover:underline">Back to guides</Link>
          <Link href="/welcome" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Try MyWallet</Link>
        </div>
      </div>
    </div>
  )
}
