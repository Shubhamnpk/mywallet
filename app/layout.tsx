import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { WalletDataProvider } from "@/contexts/wallet-data-context"

export const metadata: Metadata = {
  title: "MyWallet - Smart Financial Tracking",
  description: "Track your finances and understand spending in terms of time invested",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <WalletDataProvider>{children}</WalletDataProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
