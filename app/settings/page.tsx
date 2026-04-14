import { SettingsPageClient } from "@/components/settings/settings-page-client"

type PageProps = {
  params: Promise<Record<string, string | string[] | undefined>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SettingsPage({ params, searchParams }: PageProps) {
  await Promise.all([params, searchParams])
  return <SettingsPageClient />
}
