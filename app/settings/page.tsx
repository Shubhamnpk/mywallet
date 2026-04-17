import { Suspense } from "react"
import { SettingsPageClient } from "@/components/settings/settings-page-client"

type PageProps = {
  params: Promise<Record<string, string | string[] | undefined>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function SettingsPageSuspenseFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  )
}

export default async function SettingsPage({ params, searchParams }: PageProps) {
  await Promise.all([params, searchParams])
  return (
    <Suspense fallback={<SettingsPageSuspenseFallback />}>
      <SettingsPageClient />
    </Suspense>
  )
}