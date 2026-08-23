const MEROSHARE_API_URL = process.env.MEROSHARE_API_URL || "https://meroshare.bitnepal.net"
const MEROSHARE_API_KEY = process.env.MEROSHARE_API_KEY || ""

export async function proxyToMeroShareApi(endpoint: string, body: any) {
  const url = `${MEROSHARE_API_URL}${endpoint}`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": MEROSHARE_API_KEY,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || data.message || "MeroShare API request failed")
  }
  return data
}
