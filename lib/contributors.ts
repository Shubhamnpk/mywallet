export type ContributorCategory = "core" | "code" | "design" | "quality" | "community" | "services"

export type Contributor = {
  name: string
  role: string
  category: ContributorCategory
  description: string
  gradient: string
  link?: { label: string; href: string }
}

export const CONTRIBUTOR_CATEGORY_LABELS: Record<ContributorCategory, string> = {
  core: "Core Team",
  code: "Code & Engineering",
  design: "Design & Experience",
  quality: "Quality & Testing",
  community: "Community & Support",
  services: "Data & Services",
}

export const CATEGORY_ORDER: ContributorCategory[] = ["core", "code", "design", "quality", "community", "services"]

export const contributors: Contributor[] = [
  {
    name: "Shubham Niraula",
    role: "Founder & Lead Developer",
    category: "core",
    description:
      "Dreamed up MyWallet and built it end-to-end - architecture, encryption, PWA, and every pixel. Keeps the project alive from Nepal.",
    gradient: "from-primary to-accent",
    link: { label: "GitHub", href: "https://github.com/Shubhamnpk" },
  },
  {
    name: "BitNepal",
    role: "Technology Partner",
    category: "core",
    description:
      "Supports the infrastructure and development journey behind MyWallet, helping the project grow sustainably.",
    gradient: "from-blue-500 to-indigo-500",
    link: { label: "bitnepal.net", href: "https://bitnepal.net" },
  },
  {
    name: "The Open Source Community",
    role: "Library Authors & Maintainers",
    category: "code",
    description:
      "React, Next.js, Recharts, shadcn/ui, input-otp, sonner, and countless other libraries quietly power MyWallet. This tribute belongs to them too.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    name: "Bhagwoti Lama",
    role: "Core Tester",
    category: "quality",
    description:
      "The backbone of quality at MyWallet - testing every release, hunting edge cases, and making sure nothing ships broken.",
    gradient: "from-rose-400 to-red-500",
  },
  {
    name: "Early Beta Testers",
    role: "First Hands On Deck",
    category: "quality",
    description:
      "The brave first users who tapped every button, found every crash, and shaped the app before anyone else saw it.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    name: "Bug Reporters",
    role: "Silent Guardians",
    category: "quality",
    description:
      "Every GitHub issue, every 'hey this looks off' message. You made MyWallet sturdier with each report.",
    gradient: "from-rose-500 to-pink-500",
    link: { label: "Issues", href: "https://github.com/Shubhamnpk/mywallet/issues" },
  },
  {
    name: "Feature Requesters",
    role: "Roadmap Shapers",
    category: "community",
    description:
      "Your ideas became the roadmap. Time-aware finance, MeroShare sync, dividend outlook - built because you asked.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    name: "Design Inspiration",
    role: "The Dribbble & shadcn Collective",
    category: "design",
    description:
      "Modern interfaces stand on the shoulders of generous designers who shared patterns, palettes, and primitives with the world.",
    gradient: "from-cyan-500 to-sky-500",
  },
  {
    name: "Friends & Family",
    role: "The Patient Supporters",
    category: "community",
    description:
      "Late nights, weekend builds, endless demos. The people who believed in this project before it had a name.",
    gradient: "from-fuchsia-500 to-rose-500",
  },
  {
    name: "yonepse",
    role: "NEPSE Market Data",
    category: "services",
    description:
      "Community-maintained NEPSE LTP, price history, and market datasets that power portfolio valuations, stock details, and the valuation timeline.",
    gradient: "from-teal-500 to-emerald-500",
    link: { label: "Data source", href: "https://github.com/shubhamnpk/yonepse" },
  },
  {
    name: "MeroShare (CDSC)",
    role: "Share Transaction Sync",
    category: "services",
    description:
      "MeroShare by Central Depository System enables automated import of share transactions and IPO applications into your portfolios.",
    gradient: "from-green-500 to-lime-500",
    link: { label: "meroshare.cdsc.com.np", href: "https://meroshare.cdsc.com.np" },
  },
  {
    name: "Coinlore API",
    role: "Crypto Prices",
    category: "services",
    description:
      "Free cryptocurrency market data feeding live crypto holdings, prices, and portfolio crypto tracking.",
    gradient: "from-yellow-500 to-amber-500",
    link: { label: "coinlore.com", href: "https://www.coinlore.com/cryptocurrency-data-api" },
  },
  {
    name: "Upstash Redis",
    role: "Caching & Rate Limiting",
    category: "services",
    description:
      "Serverless Redis keeps API responses fast and protects public endpoints from abuse.",
    gradient: "from-sky-500 to-blue-600",
    link: { label: "upstash.com", href: "https://upstash.com" },
  },
  {
    name: "Frankfurter & ExchangeRate-API",
    role: "Currency Exchange Rates",
    category: "services",
    description:
      "Free, reliable FX rate APIs convert foreign currencies so multi-currency balances always stay accurate.",
    gradient: "from-violet-600 to-purple-600",
    link: { label: "frankfurter.dev", href: "https://frankfurter.dev" },
  },
  {
    name: "Dropbox API",
    role: "Encrypted Backup & Sync",
    category: "services",
    description:
      "Dropbox integration lets you back up and restore your encrypted wallet data across devices, on your own cloud.",
    gradient: "from-blue-500 to-sky-600",
    link: { label: "dropbox.com/developers", href: "https://www.dropbox.com/developers" },
  },
]

export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

export type OpenSourcePackage = {
  name: string
  description: string
  url: string
  version: string
  tag: string
}

export const openSourcePackages: OpenSourcePackage[] = [
  { name: "Next.js", description: "The React framework powering routing, SSR, and the PWA build.", url: "https://nextjs.org", version: "16.2.10", tag: "Framework" },
  { name: "React", description: "The UI library behind every screen and interaction.", url: "https://react.dev", version: "18.x", tag: "Core UI" },
  { name: "Tailwind CSS", description: "Utility-first styling that shapes the entire design system.", url: "https://tailwindcss.com", version: "4.x", tag: "Styling" },
  { name: "shadcn/ui + Radix", description: "Accessible component primitives - dialogs, selects, tooltips and more.", url: "https://www.radix-ui.com", version: "latest", tag: "Components" },
  { name: "Recharts", description: "Charts for valuation timelines, price history, and insights.", url: "https://recharts.org", version: "2.15.4", tag: "Charts" },
  { name: "Lucide Icons", description: "The icon set used across the entire interface.", url: "https://lucide.dev", version: "0.454", tag: "Icons" },
  { name: "nepali-date-converter", description: "BS/AD date conversion powering the Nepali calendar experience.", url: "https://github.com/ashesh/nepali-date-converter", version: "3.4.0", tag: "Calendar" },
  { name: "react-hook-form", description: "Fast, validated forms across the whole app.", url: "https://react-hook-form.com", version: "7.x", tag: "Forms" },
  { name: "Serwist", description: "Service worker toolkit enabling offline-first PWA behavior.", url: "https://serwist.pages.dev", version: "9.5.11", tag: "PWA" },
  { name: "Zod", description: "Schema validation keeping imported and synced data safe.", url: "https://zod.dev", version: "3.25", tag: "Validation" },
  { name: "date-fns", description: "Date math behind budgets, reminders, and timelines.", url: "https://date-fns.org", version: "4.1.0", tag: "Dates" },
  { name: "Sonner", description: "The toast notification system.", url: "https://sonner.emilkowal.ski", version: "2.0.7", tag: "UX" },
  { name: "input-otp", description: "PIN entry experience for the security guard.", url: "https://input-otp.1stg.me", version: "1.4.1", tag: "Security UX" },
  { name: "Tesseract.js", description: "In-browser OCR that powers receipt scanning.", url: "https://tesseract.projectnaptha.com", version: "6.x", tag: "OCR" },
  { name: "SheetJS (xlsx)", description: "Spreadsheet parsing for MeroShare CSV imports.", url: "https://sheetjs.com", version: "0.18.5", tag: "Import" },
  { name: "Web Push (web-push & VAPID)", description: "Push notifications for bill reminders and alerts.", url: "https://github.com/web-push-libs/web-push", version: "3.6.7", tag: "Notifications" },
]
