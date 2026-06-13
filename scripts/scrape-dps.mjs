import puppeteer from "puppeteer-core"
import fs from "fs"

async function main() {
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.CHROME_PATH,
  ].filter(Boolean)

  let executablePath
  for (const p of paths) {
    if (fs.existsSync(p)) { executablePath = p; break }
  }

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath || undefined,
    args: ["--no-sandbox"],
  })

  const page = await browser.newPage()
  await page.goto("https://meroshare.cdsc.com.np/#/login", { waitUntil: "networkidle0" })

  // Click the DP dropdown to trigger the API call
  await page.waitForSelector(".select2-selection", { timeout: 15000 })
  await page.click(".select2-selection")
  await page.waitForSelector(".select2-results__option", { timeout: 10000 })

  // Scrape all options
  const options = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".select2-results__option")).map(el => {
      const text = el.textContent?.trim() || ""
      // Format is "NAME (CODE)" e.g. "AAKASH CAPITAL LIMITED (19000)"
      const parenMatch = text.match(/^(.+?)\s*\((\d+)\)$/)
      if (parenMatch) {
        return { raw: text, code: parenMatch[2], name: parenMatch[1].trim() }
      }
      // Fallback: "CODE - NAME"
      const dashMatch = text.match(/^(\d+)\s*[–-]\s*(.+)$/)
      if (dashMatch) {
        return { raw: text, code: dashMatch[1], name: dashMatch[2].trim() }
      }
      return { raw: text, code: text, name: text }
    })
  })

  console.log(`\nFound ${options.length} DPs on MeroShare:\n`)
  options.slice(0, 5).forEach(o => console.log(`  ${o.raw}`))
  if (options.length > 5) console.log(`  ... and ${options.length - 5} more`)

  // Compare with local file
  const local = JSON.parse(fs.readFileSync("public/data/dps.json", "utf8"))
  console.log(`\nLocal file has ${local.length} DPs`)

  const localCodes = new Set(local.map(d => d.code))
  const liveCodes = new Set(options.map(o => o.code))

  const missing = options.filter(o => !localCodes.has(o.code))
  const extra = local.filter(d => !liveCodes.has(d.code))

  if (missing.length) {
    console.log(`\n⚠ ${missing.length} DPs on live site NOT in local file:`)
    missing.slice(0, 10).forEach(o => console.log(`  + ${o.raw}`))
    if (missing.length > 10) console.log(`  ... and ${missing.length - 10} more`)
  } else {
    console.log("\n✓ All live DPs are already in local file")
  }

  if (extra.length) {
    console.log(`\n⚠ ${extra.length} DPs in local file NOT on live site (possibly outdated):`)
    extra.slice(0, 10).forEach(d => console.log(`  - ${d.code} - ${d.name}`))
    if (extra.length > 10) console.log(`  ... and ${extra.length - 10} more`)
  } else {
    console.log("\n✓ No extra DPs in local file")
  }

  await browser.close()
}

main().catch(console.error)
