import { Suspense } from "react"
import { Wallet } from "lucide-react"
import { FeaturesPageClient } from "@/components/features/features-page-client"
import { PublicLayout } from "@/components/public-layout"

export const metadata = {
  title: "Features | MyWallet",
  description:
    "Explore all 45+ features of MyWallet, expense tracking, budgets, goals, NEPSE stocks, crypto, portfolio, security, offline PWA, and more. Free forever.",
}

export default function FeaturesPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        }
      >
        <FeaturesPageClient />
      </Suspense>
    </PublicLayout>
  )
}
