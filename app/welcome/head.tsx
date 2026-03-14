const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mywalletnp.vercel.app"

export default function Head() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is MyWallet really free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. MyWallet is completely free to use with no subscriptions or hidden fees."
        }
      },
      {
        "@type": "Question",
        "name": "How secure is my financial data?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Your data is protected with encryption, biometric authentication, and privacy-first storage practices."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use MyWallet offline?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. MyWallet is a PWA that works offline, so you can track expenses and budgets without internet."
        }
      }
    ]
  }

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "MyWallet - Free Personal Finance App",
    "url": siteUrl,
    "description": "Free personal finance app with time-based budgeting, goal tracking, and offline support."
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([faqSchema, webPageSchema]),
        }}
      />
    </>
  )
}
