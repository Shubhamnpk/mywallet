import { DropboxCallbackPageClient } from "@/components/dropbox/dropbox-callback-page-client"

type PageProps = {
  params: Promise<Record<string, string | string[] | undefined>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DropboxCallbackPage({ params, searchParams }: PageProps) {
  await Promise.all([params, searchParams])
  return <DropboxCallbackPageClient />
}
