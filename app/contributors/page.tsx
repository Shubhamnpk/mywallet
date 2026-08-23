import { Suspense } from "react"
import { Wallet } from "lucide-react"
import { ContributorsPageClient } from "@/components/public-pages/contributors"
import { PublicLayout } from "@/components/public-pages/public-layout"

export const metadata = {
  title: "Contributors | MyWallet",
  description:
    "A tribute to the helping hands behind MyWallet - contributors, testers, designers, and community supporters of the free, open-source finance app.",
}

export default function ContributorsPage() {
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
        <ContributorsPageClient />
      </Suspense>
    </PublicLayout>
  )
}
