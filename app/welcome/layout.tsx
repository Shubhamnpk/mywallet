import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome to MyWallet - Your Personal Finance Companion',
  description: 'Discover MyWallet, the ultimate personal finance app for tracking expenses, managing budgets, achieving goals, and securing your financial future. Start your journey to financial freedom today.',
  keywords: 'personal finance, wallet app, expense tracker, budget management, financial goals, money management, secure finance, PWA, offline support',
  authors: [{ name: 'MyWallet Team' }],
  openGraph: {
    title: 'Welcome to MyWallet - Your Personal Finance Companion',
    description: 'Take control of your finances with MyWallet. Track expenses, set budgets, achieve goals, and enjoy secure, offline-ready financial management.',
    url: 'https://mywallet.app/welcome',
    siteName: 'MyWallet',
    images: [
      {
        url: '/mywallet.png',
        width: 1200,
        height: 630,
        alt: 'MyWallet App Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Welcome to MyWallet - Your Personal Finance Companion',
    description: 'Take control of your finances with MyWallet. Track expenses, set budgets, achieve goals, and enjoy secure, offline-ready financial management.',
    images: ['/mywallet.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://mywallet.app/welcome',
  },
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}