import type { Page } from "puppeteer-core"

export type MeroShareTransactionHistoryRow = {
  scrip: string
  transactionDate: string
  creditQuantity: number
  debitQuantity: number
  balanceAfterTransaction: number
  historyDescription: string
}

const MEROSHARE_LOGIN_URL = "https://meroshare.cdsc.com.np/#/login"
const MEROSHARE_TRANSACTION_URL = "https://meroshare.cdsc.com.np/#/transaction"

async function selectDepositoryParticipant(page: Page, dpId: string) {
  await page.waitForSelector(".select2-selection", { timeout: 20000 })
  await page.click(".select2-selection")
  await page.waitForSelector(".select2-search__field", { visible: true, timeout: 10000 })
  await page.type(".select2-search__field", dpId, { delay: 50 })
  await page.waitForSelector(".select2-results__option", { visible: true, timeout: 10000 }).catch(() => null)
  await page.keyboard.press("Enter")
}

export async function loginToMeroShare(page: Page, credentials: {
  dpId: string
  username: string
  password: string
}) {
  await page.goto(MEROSHARE_LOGIN_URL, { waitUntil: "domcontentloaded" })
  await selectDepositoryParticipant(page, credentials.dpId)

  await page.waitForSelector("#username", { visible: true, timeout: 15000 })
  await page.type("#username", credentials.username, { delay: 40 })
  await page.type("#password", credentials.password, { delay: 40 })

  const loginButton = await page.$('button[type="submit"]')
  if (loginButton) await loginButton.click()
  else await page.keyboard.press("Enter")

  await page.waitForFunction(() => {
    const body = document.body.textContent || ""
    return window.location.href.includes("/dashboard") ||
      document.querySelector(".toast-error, .toast-message, .error-message") !== null ||
      body.includes("Attempts remaining")
  }, { timeout: 30000 }).catch(() => null)

  if (!page.url().includes("/dashboard")) {
    const errorMessage = await page.evaluate(() => {
      const alert = document.querySelector(".toast-error, .toast-message, .error-message")
      return alert?.textContent?.trim() ||
        (document.body.textContent?.includes("Attempts remaining") ? "Invalid credentials" : "")
    })
    throw new Error(errorMessage || "Login failed or timed out. Check your MeroShare credentials.")
  }
}

export async function getMeroShareProfileName(page: Page) {
  await page.waitForFunction(() => {
    const selectors = [
      ".user-profile-name--user-name span",
      ".user-profile-name span",
      ".user-name",
      ".profile-text span",
    ]

    return selectors.some((selector) => {
      const value = document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim()
      return value && !value.toLowerCase().includes("mero share profile")
    })
  }, { timeout: 10000 }).catch(() => null)

  return await page.evaluate(() => {
    const selectors = [
      ".user-profile-name--user-name span",
      ".user-profile-name span",
      ".user-name",
      ".profile-text span",
    ]

    for (const selector of selectors) {
      const value = document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim()
      if (value && !value.toLowerCase().includes("mero share profile")) return value
    }

    return ""
  })
}

export async function logoutFromMeroShare(page: Page) {
  await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      "a, button, .header-menu__link, .profile-image__button--logout"
    ))
    const logoutTarget = candidates.find((element) => {
      const text = element.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || ""
      const tooltip = element.getAttribute("tooltip")?.toLowerCase() || ""
      const className = element.className?.toString().toLowerCase() || ""
      return text.includes("logout") || tooltip.includes("logout") || className.includes("logout")
    })
    logoutTarget?.click()
  }).catch(() => null)

  await new Promise(resolve => setTimeout(resolve, 1000))
}

async function clickShareTransactionSidebar(page: Page) {
  await page.goto(MEROSHARE_TRANSACTION_URL, { waitUntil: "domcontentloaded" })
  await new Promise(resolve => setTimeout(resolve, 2500))

  if (await waitForTransactionHistoryForm(page, 5000)) return

  await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll("a, button, .nav-link, .sidebar-menu li, li"))
    const target = candidates.find((element) => {
      const text = element.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || ""
      return text === "share transaction" || text.includes("share transaction")
    })
    if (target) (target as HTMLElement).click()
  }).catch(() => null)

  const foundForm = await waitForTransactionHistoryForm(page, 25000)
  if (!foundForm) {
    const debugText = await getPageDebugText(page)
    throw new Error(`Could not open MeroShare transaction history.${debugText ? ` Page text: ${debugText}` : ""}`)
  }
}

async function waitForTransactionHistoryForm(page: Page, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const isReady = await page.evaluate(() => {
      const body = document.body.textContent?.replace(/\s+/g, " ").toLowerCase() || ""
      return Boolean(document.querySelector("#radio-range")) ||
        (body.includes("transaction history") && body.includes("filter by"))
      })
      if (isReady) return true
    } catch (error: any) {
      const message = error?.message || ""
      if (!message.includes("detached") && !message.includes("Execution context was destroyed")) {
        throw error
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return false
}

async function getPageDebugText(page: Page) {
  return await page.evaluate(() =>
    document.body.textContent?.replace(/\s+/g, " ").trim().slice(0, 500) || ""
  ).catch(() => "")
}

async function chooseDateFilter(page: Page) {
  const foundForm = await waitForTransactionHistoryForm(page, 20000)
  if (!foundForm) {
    const debugText = await getPageDebugText(page)
    throw new Error(`Could not find the Date filter in MeroShare transaction history.${debugText ? ` Page text: ${debugText}` : ""}`)
  }

  const clickedDateRadio = await page.evaluate(() => {
    const dateRadio = document.querySelector<HTMLInputElement>("#radio-range")
    const dateLabel = document.querySelector<HTMLElement>("label[for='radio-range']")
    const dateOption = Array.from(document.querySelectorAll<HTMLElement>(".transaction-radio-btn label, .transaction-radio-btn h6, label"))
      .find((element) => element.textContent?.replace(/\s+/g, " ").trim().toLowerCase() === "date")

    if (dateRadio) {
      dateRadio.click()
      dateRadio.checked = true
      dateRadio.dispatchEvent(new Event("input", { bubbles: true }))
      dateRadio.dispatchEvent(new Event("change", { bubbles: true }))
      return true
    }

    if (dateLabel) {
      dateLabel.click()
      return true
    }

    if (dateOption) {
      dateOption.click()
      return true
    }

    return false
  })

  if (!clickedDateRadio) {
    const debugText = await getPageDebugText(page)
    throw new Error(`Could not select the Date filter in MeroShare transaction history.${debugText ? ` Page text: ${debugText}` : ""}`)
  }

  const dateSelected = await waitForDateFilterSelected(page, 10000)
  if (!dateSelected) {
    const debugText = await getPageDebugText(page)
    throw new Error(`MeroShare did not switch to Date filter.${debugText ? ` Page text: ${debugText}` : ""}`)
  }

  await new Promise(resolve => setTimeout(resolve, 1500))
}

async function waitForDateFilterSelected(page: Page, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const isSelected = await page.evaluate(() => {
        const dateRadio = document.querySelector<HTMLInputElement>("#radio-range")
        return Boolean(dateRadio?.checked) ||
          document.querySelector("table thead")?.textContent?.includes("Transaction Date")
      })
      if (isSelected) return true
    } catch (error: any) {
      const message = error?.message || ""
      if (!message.includes("detached") && !message.includes("Execution context was destroyed")) {
        throw error
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return false
}

const parseQuantity = (value: string) => {
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized || normalized === "-") return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function scrapeMeroShareTransactionHistory(page: Page) {
  await clickShareTransactionSidebar(page)
  await chooseDateFilter(page)

  await page.waitForFunction(() => {
    const body = document.body.textContent || ""
    return document.querySelectorAll("table tbody tr").length > 0 ||
      body.includes("No Record") ||
      body.includes("Scrip")
  }, { timeout: 30000 })

  const rows = await page.evaluate(() => {
    const normalizeHeader = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase()
    const tables = Array.from(document.querySelectorAll("table"))
    const transactionTable = tables.find((table) => {
      const header = normalizeHeader(table.querySelector("thead")?.textContent || table.textContent || "")
      return header.includes("scrip") &&
        header.includes("transaction date") &&
        header.includes("credit quantity") &&
        header.includes("debit quantity")
    }) || tables[0]

    if (!transactionTable) return []

    return Array.from(transactionTable.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() || ""))
      .filter((cells) => cells.length >= 7 && !cells.join(" ").toLowerCase().includes("no record"))
      .map((cells) => ({
        scrip: cells[1] || "",
        transactionDate: cells[2] || "",
        creditQuantity: cells[3] || "",
        debitQuantity: cells[4] || "",
        balanceAfterTransaction: cells[5] || "",
        historyDescription: cells.slice(6).join(" ").trim(),
      }))
  })

  return rows
    .map((row) => ({
      scrip: row.scrip.trim().toUpperCase(),
      transactionDate: row.transactionDate.trim(),
      creditQuantity: parseQuantity(row.creditQuantity),
      debitQuantity: parseQuantity(row.debitQuantity),
      balanceAfterTransaction: parseQuantity(row.balanceAfterTransaction),
      historyDescription: row.historyDescription.trim(),
    }))
    .filter((row) => row.scrip && row.transactionDate && (row.creditQuantity > 0 || row.debitQuantity > 0))
}
