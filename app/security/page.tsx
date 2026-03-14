import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export const metadata: Metadata = {
  title: "Security & Privacy",
  description: "Learn how MyWallet protects your data with encryption, privacy mode, and secure on-device storage.",
  keywords: "finance app security, personal finance privacy, encrypted budgeting app, secure expense tracker",
  alternates: {
    canonical: "/security",
  },
  openGraph: {
    title: "MyWallet Security & Privacy",
    description: "Learn how MyWallet protects your data with encryption, privacy mode, and secure on-device storage.",
    url: `${siteUrl}/security`,
    type: "website",
    siteName: "MyWallet",
    images: [
      { url: "/mywallet.png", width: 1200, height: 630, alt: "MyWallet security and privacy" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyWallet Security & Privacy",
    description: "Learn how MyWallet protects your data with encryption, privacy mode, and secure on-device storage.",
    images: ["/mywallet.png"],
  },
}

export default function SecurityPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "MyWallet Security & Privacy",
    url: `${siteUrl}/security`,
    description: "Security and privacy practices for the MyWallet personal finance app.",
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <header className="space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-primary">Security & Privacy</p>
          <h1 className="text-3xl sm:text-4xl font-black">Your financial data stays private and protected</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            MyWallet is built to keep your data safe with encrypted storage, optional PIN protection, and privacy-first design.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Local Encryption",
              description: "Sensitive data is encrypted on-device to reduce exposure and keep data protected offline.",
            },
            {
              title: "Privacy Mode",
              description: "Hide sensitive balances instantly when you need to share your screen.",
            },
            {
              title: "PIN & Biometric Options",
              description: "Lock the app with PIN and supported biometric authentication.",
            },
            {
              title: "Data Ownership",
              description: "Export and delete your data anytime from settings.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/50 p-5 space-y-3">
          <h2 className="text-xl font-bold">Questions about security?</h2>
          <p className="text-sm text-muted-foreground">
            We are happy to share more about how MyWallet protects your personal finance data.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/welcome" className="text-sm font-semibold text-primary hover:underline">Get started</Link>
            <Link href="/features" className="text-sm font-semibold text-muted-foreground hover:text-foreground">See features</Link>
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
