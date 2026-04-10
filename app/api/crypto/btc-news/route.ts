import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const RSS_URL = "https://bitcoinmagazine.com/.rss/full/"
const MAX_ITEMS = 12

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const extractTagValue = (xml: string, tag: string) => {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
  const match = regex.exec(xml)
  if (!match?.[1]) return ""
  return match[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim()
}

const extractTags = (xml: string, tag: string) => {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi")
  return Array.from(xml.matchAll(regex)).map((match) =>
    match[1] ? match[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim() : "",
  )
}

const parseRss = (xml: string) => {
  const items: Array<{
    id: string
    title: string
    link: string
    publishedAt?: string
    summary?: string
    author?: string
    categories?: string[]
  }> = []

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  for (const match of xml.matchAll(itemRegex)) {
    const itemXml = match[1]
    if (!itemXml) continue

    const title = decodeEntities(extractTagValue(itemXml, "title"))
    const link = extractTagValue(itemXml, "link")
    const guid = extractTagValue(itemXml, "guid")
    const pubDateRaw = extractTagValue(itemXml, "pubDate")
    const descriptionRaw = extractTagValue(itemXml, "description")
    const creator = decodeEntities(extractTagValue(itemXml, "dc:creator"))
    const categories = extractTags(itemXml, "category").map(decodeEntities).filter(Boolean)

    const publishedAt = (() => {
      if (!pubDateRaw) return undefined
      const parsed = Date.parse(pubDateRaw)
      return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined
    })()
    const summary = descriptionRaw
      ? decodeEntities(stripHtml(descriptionRaw))
      : undefined

    if (!title || !link) continue

    items.push({
      id: guid || link,
      title,
      link,
      publishedAt,
      summary,
      author: creator || undefined,
      categories: categories.length ? categories : undefined,
    })

    if (items.length >= MAX_ITEMS) break
  }

  return items
}

export async function GET() {
  try {
    const response = await fetch(RSS_URL, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: "Failed to fetch Bitcoin news",
      })
    }

    const xml = await response.text()
    if (!xml || !xml.includes("<item>")) {
      return errorResponse({
        status: 502,
        code: "UPSTREAM_ERROR",
        message: "Invalid Bitcoin RSS data",
      })
    }

    const items = parseRss(xml)
    return NextResponse.json({ source: "Bitcoin Magazine", items })
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Bitcoin news is currently unreachable",
    })
  }
}
