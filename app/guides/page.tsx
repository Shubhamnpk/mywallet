import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export const metadata: Metadata = {
  title: "Guides",
  description: "Personal finance guides for budgeting, expense tracking, and time-based money management.",
  keywords: "budgeting guide, expense tracker guide, time based budgeting guide, Nepal finance tips",
  alternates: {
    canonical: "/guides",
  },
  openGraph: {
    title: "MyWallet Guides | Budgeting and Expense Tracking",
    description: "Personal finance guides for budgeting, expense tracking, and time-based money management.",
    url: `${siteUrl}/guides`,
    type: "website",
    siteName: "MyWallet",
    images: [
      { url: "/mywallet.png", width: 1200, height: 630, alt: "MyWallet guides" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyWallet Guides | Budgeting and Expense Tracking",
    description: "Personal finance guides for budgeting, expense tracking, and time-based money management.",
    images: ["/mywallet.png"],
  },
}

const guides = [
  {
    title: "Time-Based Budgeting: A Practical Guide",
    href: "/guides/time-based-budgeting",
    description: "Learn how to turn expenses into time and make smarter spending decisions.",
  },
  {
    title: "How to Budget in Nepal (Simple Steps)",
    href: "/guides/budgeting-nepal",
    description: "A simple budgeting plan tailored for Nepal with actionable steps.",
  },
  {
    title: "Best Expense Tracker Tips for Nepal",
    href: "/guides/expense-tracker-nepal",
    description: "Improve your expense tracking habit with a system that actually sticks.",
  },
]

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <header className="space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-primary">Guides</p>
          <h1 className="text-3xl sm:text-4xl font-black">Personal finance guides for real life</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Practical advice on budgeting, expense tracking, and time-based money management.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="rounded-2xl border border-border/60 bg-card/60 p-5 hover:border-primary/30 transition-colors"
            >
              <h2 className="text-lg font-bold">{guide.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{guide.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
