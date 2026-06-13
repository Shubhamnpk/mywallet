import puppeteer, { type Browser, type Page } from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import fs from "fs"

function getBrowserlessEndpoint() {
  const explicitEndpoint = process.env.BROWSERLESS_WS_ENDPOINT || process.env.BROWSERLESS_URL
  if (explicitEndpoint) return explicitEndpoint

  const token = process.env.BROWSERLESS_TOKEN
  if (!token) return ""

  const region = process.env.BROWSERLESS_REGION || "production-sfo"
  return `wss://${region}.browserless.io?token=${encodeURIComponent(token)}`
}

export type MeroShareBrowserProvider = "auto" | "browserless" | "local"

const BLOCKED_RESOURCE_TYPES = new Set([
  "image", "font", "media", "stylesheet", "texttrack", "imageset",
])

const BLOCKED_RESOURCE_DOMAINS = new Set([
  "google-analytics.com", "googletagmanager.com", "facebook.net",
  "doubleclick.net", "hotjar.com", "newrelic.com",
])

async function setupPage(page: Page) {
  await page.setRequestInterception(true)
  page.on("request", (request) => {
    const resourceType = request.resourceType()
    const url = new URL(request.url())

    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      request.abort()
      return
    }

    for (const domain of BLOCKED_RESOURCE_DOMAINS) {
      if (url.hostname.includes(domain)) {
        request.abort()
        return
      }
    }

    request.continue()
  })

  await page.setViewport({ width: 1280, height: 800 })
}

function patchBrowserNewPage(browser: Browser): Browser {
  const originalNewPage = browser.newPage.bind(browser)
  browser.newPage = async () => {
    const page = await originalNewPage()
    await setupPage(page)
    return page
  }
  return browser
}

export async function getMeroShareBrowser(options?: { showBrowser?: boolean; browserProvider?: MeroShareBrowserProvider }) {
  const browserProvider = options?.browserProvider || "auto"
  const isVisibleDebug = process.env.MEROSHARE_VISIBLE_BROWSER === "1" || Boolean(options?.showBrowser) || browserProvider === "local"
  const browserlessEndpoint = getBrowserlessEndpoint()

  if (browserProvider === "browserless" && !browserlessEndpoint) {
    throw new Error("Browserless is selected, but BROWSERLESS_TOKEN, BROWSERLESS_URL, or BROWSERLESS_WS_ENDPOINT is not configured.")
  }

  if (browserProvider !== "local" && browserlessEndpoint) {
    return patchBrowserNewPage(await puppeteer.connect({
      browserWSEndpoint: browserlessEndpoint,
    }))
  }

  if (browserProvider === "local" && (process.env.NODE_ENV === "production" || process.env.VERCEL)) {
    throw new Error("Local Chrome browser mode is only available on a local development machine.")
  }

  if (browserProvider === "auto" && (process.env.NODE_ENV === "production" || process.env.VERCEL)) {
    return patchBrowserNewPage(await puppeteer.launch({
      args: chromium.args,
      defaultViewport: (chromium as any).defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: (chromium as any).headless,
    }))
  }

  const executablePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    process.env.CHROME_PATH,
  ].filter(Boolean) as string[]

  let executablePath = ""
  for (const p of executablePaths) {
    if (fs.existsSync(p)) {
      executablePath = p
      break
    }
  }

  return patchBrowserNewPage(await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: !isVisibleDebug,
    executablePath: executablePath || undefined,
  }))
}
