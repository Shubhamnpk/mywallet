import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export const metadata: Metadata = {
  title: "Pricing",
  description: "MyWallet is free. No subscriptions, no hidden fees. Track expenses, budgets, and goals without paying.",
  keywords: "free budgeting app, free expense tracker, personal finance app pricing",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "MyWallet Pricing | Free Personal Finance App",
    description: "MyWallet is free. No subscriptions, no hidden fees.",
    url: `${siteUrl}/pricing`,
    type: "website",
    siteName: "MyWallet",
    images: [
      { url: "/mywallet.png", width: 1200, height: 630, alt: "MyWallet pricing" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyWallet Pricing | Free Personal Finance App",
    description: "MyWallet is free. No subscriptions, no hidden fees.",
    images: ["/mywallet.png"],
  },
}

export default function PricingPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "MyWallet Pricing",
    url: `${siteUrl}/pricing`,
    description: "MyWallet pricing overview.",
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <header className="space-y-4 text-left">
          <p className="text-xs font-black uppercase tracking-widest text-primary">Pricing</p>
          <h1 className="text-3xl sm:text-4xl font-black">Free. Simple. Built for everyone.</h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            MyWallet is a free personal finance app — track expenses, set budgets, and manage goals without subscriptions.
          </p>
        </header>

        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-xl font-bold">Free plan</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Everything you need to manage your money today.
          </p>
          <div className="mt-4 text-4xl font-black">NPR 0</div>
          <p className="text-xs text-muted-foreground mt-1">No card required</p>
          <ul className="mt-4 text-sm text-muted-foreground space-y-2">
            <li>Expense and income tracking</li>
            <li>Budgets and goals</li>
            <li>Time-based insights</li>
            <li>Offline support</li>
          </ul>
          <div className="mt-5">
            <Link href="/welcome" className="text-sm font-semibold text-primary hover:underline">Start free</Link>
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
