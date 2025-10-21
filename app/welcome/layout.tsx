import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MyWallet - Free Personal Finance App | Track Expenses & Budget Money",
  description: "Discover MyWallet, the innovative personal finance app that shows expenses in terms of time worked. Free budget tracker with offline functionality, goal setting, and smart financial insights.",
  keywords: "personal finance app, free budget tracker, expense tracker, money management, financial goals, time-based budgeting, offline finance app, PWA, financial planning",
  openGraph: {
    title: "MyWallet - Free Personal Finance App | Track Expenses & Budget Money",
    description: "Take control of your finances with MyWallet - the innovative personal finance app that shows expenses in terms of time worked. Free forever, works offline.",
    url: "https://mywallet.app/welcome",
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
    title: "MyWallet - Free Personal Finance App | Track Expenses & Budget Money",
    description: "Take control of your finances with MyWallet - the innovative personal finance app that shows expenses in terms of time worked.",
    images: ["/mywallet.png"],
  },
  alternates: {
    canonical: "/welcome",
  },
}

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}