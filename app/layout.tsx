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
  title: "MyWallet - Smart Financial Tracking",
  description: "Track your finances and understand spending in terms of time invested",
  icons: {
    icon: '/image.png',
    apple: '/image.png',
  },
  manifest: '/manifest.json',
  other: {
    'google-site-verification': 'sbInOUmzo4b091hxSKQiABNP9QYXpwYKIMlzfKyavQE',
    'msapplication-TileImage': '/image.png',
    'msapplication-TileColor': '#000000',
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
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Lato:wght@400;700&family=Poppins:wght@400;500;600;700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet" />
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