import { Suspense } from "react"
import { Wallet } from "lucide-react"
import { AboutPageClient } from "@/components/about/about-page-client"
import { PublicLayout } from "@/components/public-layout"

export const metadata = {
  title: "About | MyWallet",
  description:
    "Learn about MyWallet, the free, privacy-first personal finance app built with passion from Nepal. Open source, offline-ready, and time-aware.",
}

export default function AboutPage() {
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
        <AboutPageClient />
      </Suspense>
    </PublicLayout>
  )
}
