import type { ReactNode } from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProviderWrapper } from "@/components/theme-provider-wrapper"
import { WalletDataProvider } from "@/contexts/wallet-data-context"
import { PrivacyModeProvider } from "@/hooks/use-privacy-mode"
import { SessionGuard } from "@/components/security/session-guard"
import { SessionDebug } from "@/components/security/session-debug"

export const metadata: Metadata = {
  title: "MyWallet - Smart Financial Tracking",
  description: "Track your finances and understand spending in terms of time invested",
  icons: {
    icon: '/image.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/image.png" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProviderWrapper>
          <PrivacyModeProvider>
            <WalletDataProvider>
              <SessionGuard>{children}</SessionGuard>
              <SessionDebug />
            </WalletDataProvider>
          </PrivacyModeProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  )
}
