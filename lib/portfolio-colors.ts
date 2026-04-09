const DEFAULT_SECTOR_KEY = "others"

const SECTOR_COLOR_FAMILIES: Record<string, string[]> = {
  banking: ["#0b3c8a", "#1456c5", "#1d6ff2", "#4d97ff", "#7fb6ff"],
  "commercial bank": ["#0b3c8a", "#1456c5", "#1d6ff2", "#4d97ff", "#7fb6ff"],
  development: ["#005f56", "#00897b", "#00b8a9", "#37d6c7", "#74e8dd"],
  "development bank": ["#005f56", "#00897b", "#00b8a9", "#37d6c7", "#74e8dd"],
  finance: ["#0b5d1e", "#0f7a28", "#169c35", "#27c24c", "#7ae582"],
  microfinance: ["#0a6b3b", "#0f8a4a", "#18a85c", "#31c977", "#8be8ac"],
  hydropower: ["#0057b8", "#0077ed", "#00a6fb", "#33c7ff", "#72deff"],
  manufacturing: ["#b54708", "#e05a00", "#ff7a00", "#ff9f40", "#ffc170"],
  "manufacturing and processing": ["#b54708", "#e05a00", "#ff7a00", "#ff9f40", "#ffc170"],
  hotels: ["#b42318", "#dd4b39", "#ff6b4a", "#ff8a65", "#ffb199"],
  trading: ["#157f1f", "#1fa52b", "#32c84b", "#5ee06f", "#93f29b"],
  investment: ["#6d28d9", "#8b3dff", "#a855f7", "#c084fc", "#ddb2ff"],
  insurance: ["#9f1239", "#c81e5b", "#e11d48", "#f04373", "#ff7da0"],
  "life insurance": ["#9f1239", "#c81e5b", "#e11d48", "#f04373", "#ff7da0"],
  "non-life insurance": ["#7e22ce", "#a21caf", "#c026d3", "#dd58e8", "#ef8cff"],
  mutual: ["#a16207", "#ca8a04", "#f0b100", "#ffcb2f", "#ffe06e"],
  "mutual fund": ["#a16207", "#ca8a04", "#f0b100", "#ffcb2f", "#ffe06e"],
  "closed-end fund": ["#a16207", "#ca8a04", "#f0b100", "#ffcb2f", "#ffe06e"],
  technology: ["#312e81", "#4338ca", "#5b4dff", "#7a73ff", "#a19cff"],
  telecom: ["#006064", "#00838f", "#00acc1", "#26c6da", "#67dff0"],
  "power transmission": ["#075985", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
  others: ["#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"],
}

const normalizeSectorKey = (sector?: string | null) => {
  const normalized = sector?.trim().toLowerCase()
  if (!normalized) return DEFAULT_SECTOR_KEY

  for (const key of Object.keys(SECTOR_COLOR_FAMILIES)) {
    if (normalized.includes(key)) return key
  }

  return DEFAULT_SECTOR_KEY
}

const getStableIndex = (value: string, modulo: number) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash) % modulo
}

export const getSectorColor = (sector?: string | null) => {
  const family = SECTOR_COLOR_FAMILIES[normalizeSectorKey(sector)] || SECTOR_COLOR_FAMILIES[DEFAULT_SECTOR_KEY]
  return family[1] || family[0]
}

export const getSectorVariantColor = (sector: string | null | undefined, symbol: string) => {
  const family = SECTOR_COLOR_FAMILIES[normalizeSectorKey(sector)] || SECTOR_COLOR_FAMILIES[DEFAULT_SECTOR_KEY]
  const stableIndex = getStableIndex(`${normalizeSectorKey(sector)}:${symbol.trim().toUpperCase()}`, family.length)
  return family[stableIndex]
}
