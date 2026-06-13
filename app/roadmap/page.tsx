import roadmapData from "@/data/roadmap.json"
import { RoadmapPageClient, type RoadmapData } from "@/components/roadmap/roadmap-page-client"

export const metadata = {
  title: "Roadmap | MyWallet",
  description: "Track MyWallet goals, shipped work, active initiatives, planned improvements, and future product vision.",
}

export default function RoadmapPage() {
  return <RoadmapPageClient data={roadmapData as RoadmapData} />
}
