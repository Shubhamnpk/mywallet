import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export const metadata: Metadata = {
  title: "How to Budget in Nepal",
  description: "A simple budgeting guide for Nepal: track expenses, set savings goals, and build a monthly plan.",
  keywords: "budgeting Nepal, Nepal budget app, expense tracking Nepal, personal finance Nepal",
  alternates: {
    canonical: "/guides/budgeting-nepal",
  },
  openGraph: {
    title: "How to Budget in Nepal | MyWallet Guide",
    description: "A simple budgeting guide for Nepal: track expenses, set savings goals, and build a monthly plan.",
    url: `${siteUrl}/guides/budgeting-nepal`,
    type: "article",
    siteName: "MyWallet",
    images: [
      { url: "/mywallet.png", width: 1200, height: 630, alt: "Budgeting in Nepal guide" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Budget in Nepal | MyWallet Guide",
    description: "A simple budgeting guide for Nepal: track expenses, set savings goals, and build a monthly plan.",
    images: ["/mywallet.png"],
  },
}

export default function BudgetingNepalGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-primary">Guide</p>
          <h1 className="text-3xl sm:text-4xl font-black">How to Budget in Nepal (Simple Steps)</h1>
          <p className="text-base text-muted-foreground">
            Create a practical monthly budget with clear categories for necessities, savings, and lifestyle spending.
          </p>
        </header>

        <section className="space-y-4 text-sm text-muted-foreground">
          <p>
            Start by listing your fixed costs: rent, utilities, transportation, and loan payments. Then estimate monthly food and daily expenses.
          </p>
          <p>
            Use a simple rule like 50/30/20 or adjust it to your income. The key is consistency and tracking.
          </p>
          <p>
            MyWallet helps you track these categories and shows progress in real time.
          </p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <h2 className="text-lg font-bold">Budgeting checklist</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Track every expense for 30 days</li>
            <li>Set savings goal (even small)</li>
            <li>Review weekly and adjust</li>
          </ul>
        </section>

        <div className="flex gap-3">
          <Link href="/guides" className="text-sm font-semibold text-primary hover:underline">Back to guides</Link>
          <Link href="/welcome" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Start budgeting</Link>
        </div>
      </div>
    </div>
  )
}
