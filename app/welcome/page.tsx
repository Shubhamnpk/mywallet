import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { Wallet } from "lucide-react"
import { WelcomePageClient } from "@/components/welcome/welcome-page-client"

const siteUrl = "https://mywalletnp.vercel.app"
const welcomePath = "/welcome"

const pageTitle = "MyWallet - Free Personal Finance App | Track Expenses & Budget Money"
const pageDescription =
  "Discover MyWallet, the innovative personal finance app that shows expenses in terms of time worked. Free budget tracker with offline functionality, goal setting, and smart financial insights."
const ogDescription =
  "Take control of your finances with MyWallet - the innovative personal finance app that shows expenses in terms of time worked. Free forever, works offline."

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords:
    "personal finance app, free budget tracker, expense tracker, money management, financial goals, time-based budgeting, offline finance app, PWA, financial planning",
  robots: { index: true, follow: true },
  openGraph: {
    title: pageTitle,
    description: ogDescription,
    url: `${siteUrl}${welcomePath}`,
    siteName: "MyWallet",
    type: "website",
    images: [
      {
        url: "/mywallet.png",
        width: 1200,
        height: 630,
        alt: "MyWallet - Free Personal Finance App Interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: ogDescription,
    images: ["/mywallet.png"],
  },
  alternates: { canonical: welcomePath },
}

const welcomeWebPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${siteUrl}${welcomePath}#webpage`,
  url: `${siteUrl}${welcomePath}`,
  name: pageTitle,
  description: pageDescription,
  isPartOf: { "@type": "WebSite", name: "MyWallet", url: siteUrl },
  about: {
    "@type": "SoftwareApplication",
    name: "MyWallet",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
}

function WelcomePageSuspenseFallback() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary-foreground" aria-hidden />
        </div>
        <span className="sr-only">Loading welcome page</span>
        <div
          className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
      </div>
    </div>
  )
}

/**
 * Single entry for `/welcome`: route metadata (server `<head>`), structured data, noscript summary,
 * and the client landing (Suspense wraps `useSearchParams` for a static prerender).
 */
export default function WelcomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(welcomeWebPageJsonLd) }}
      />
      <noscript>
        <div className="min-h-screen bg-background text-foreground p-8 max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">MyWallet — free personal finance app</h1>
          <p className="text-muted-foreground leading-relaxed">
            Track expenses and budgets, set goals, and see spending in terms of time worked. Works
            offline as a PWA. No hidden fees.
          </p>
          <p className="flex flex-wrap gap-x-2 gap-y-1 items-center">
            <Link className="text-primary underline font-medium" href={`${welcomePath}?start=1`}>
              Get started free
            </Link>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <Link className="text-primary underline font-medium" href="/">
              Open app
            </Link>
          </p>
        </div>
      </noscript>
      <Suspense fallback={<WelcomePageSuspenseFallback />}>
        <WelcomePageClient />
      </Suspense>
    </>
  )
}
