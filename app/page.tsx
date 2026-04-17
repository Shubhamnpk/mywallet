import { MyWalletPageClient } from "@/components/dashboard/my-wallet-page-client"

type PageProps = {
  params: Promise<Record<string, string | string[] | undefined>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HomePage({ params, searchParams }: PageProps) {
  await Promise.all([params, searchParams])
  return <MyWalletPageClient />
}
