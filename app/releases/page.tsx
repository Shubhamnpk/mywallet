import releasesData from "@/data/releases.json"
import packageJson from "@/package.json"
import { ReleasesPageClient, type ReleasesData } from "@/components/releases/releases-page-client"

export const metadata = {
  title: "Release Notes | MyWallet",
  description: "Public changelog and shipped versions of MyWallet.",
}

export default function ReleasesPage() {
  return <ReleasesPageClient data={releasesData as ReleasesData} currentVersion={packageJson.version} />
}
