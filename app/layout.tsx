import type { ReactNode } from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProviderWrapper } from "@/components/theme-provider-wrapper"
import { WalletDataProvider } from "@/contexts/wallet-data-context"
import { PrivacyModeProvider } from "@/hooks/use-privacy-mode"
import { SessionGuard } from "@/components/security/session-guard"
import { SessionDebug } from "@/components/security/session-debug"
import RegisterSW from '@/components/pwa/register-sw'
import InstallButton from '@/components/pwa/install-button'
import UpdateNotification from '@/components/pwa/update-notification'
import UpdateSuccess from '@/components/pwa/update-success'
import { Toaster } from "@/components/ui/sonner"


export const metadata: Metadata = {
  title: "MyWallet - Smart Financial Tracking App | Free Personal Finance Manager",
  description: "Take control of your finances with MyWallet - the innovative personal finance app that shows expenses in terms of time worked. Track budgets, achieve goals, and grow wealth with smart insights. Free forever, works offline.",
  keywords: "personal finance app, budget tracker, expense manager, financial planning, money management, savings app, financial goals, time-based budgeting, offline finance app, PWA",
  authors: [{ name: "MyWallet Team" }],
  creator: "MyWallet",
  publisher: "MyWallet",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://mywalletnp.vercel.app'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/image.png', sizes: 'any' },
      { url: '/image.png', sizes: '16x16', type: 'image/png' },
      { url: '/image.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/image.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mywalletnp.vercel.app',
    title: 'MyWallet - Smart Financial Tracking App | Free Personal Finance Manager',
    description: 'Take control of your finances with MyWallet - the innovative personal finance app that shows expenses in terms of time worked. Track budgets, achieve goals, and grow wealth with smart insights.',
    siteName: 'MyWallet',
    images: [
      {
        url: '/mywallet.png',
        width: 1200,
        height: 630,
        alt: 'MyWallet - Smart Financial Tracking App Interface',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyWallet - Smart Financial Tracking App | Free Personal Finance Manager',
    description: 'Take control of your finances with MyWallet - the innovative personal finance app that shows expenses in terms of time worked.',
    images: ['/mywallet.png'],
    creator: '@mywalletapp',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'google-site-verification': 'sbInOUmzo4b091hxSKQiABNP9QYXpwYKIMlzfKyavQE',
    'msapplication-TileImage': '/image.png',
    'msapplication-TileColor': '#000000',
    'theme-color': '#000000',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "MyWallet",
    "description": "Smart financial tracking app that shows expenses in terms of time worked. Free personal finance manager with offline capabilities.",
    "url": "https://mywalletnp.vercel.app",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Organization",
      "name": "MyWallet Team",
      "url": "https://mywalletnp.vercel.app"
    },
    "publisher": {
      "@type": "Organization",
      "name": "MyWallet",
      "url": "https://mywalletnp.vercel.app"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "100000",
      "bestRating": "5",
      "worstRating": "1"
    },
    "featureList": [
      "Expense tracking",
      "Budget management",
      "Financial goal setting",
      "Time-based expense analysis",
      "Offline functionality",
      "Biometric security",
      "Cross-platform sync"
    ]
  };

  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Lato:wght@400;700&family=Poppins:wght@400;500;600;700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
  <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
    <RegisterSW />
    <UpdateNotification />
    <UpdateSuccess />
    <ThemeProviderWrapper>
      <PrivacyModeProvider>
        <WalletDataProvider>
            <SessionGuard>{children}</SessionGuard>
        </WalletDataProvider>
      </PrivacyModeProvider>
      <Toaster />
    </ThemeProviderWrapper>
      </body>
    </html>
  )
}