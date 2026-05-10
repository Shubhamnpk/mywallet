# Chromium Extension Prototype

This repo now includes a local-first Chromium extension scaffold in [browser-extension](../browser-extension).

## What it does

- Connects to an open MyWallet tab running on:
  - `http://localhost/*`
  - `http://127.0.0.1/*`
  - `https://mywalletnp.vercel.app/*`
- Reads a safe wallet snapshot through an in-app bridge
- Shows:
  - balance
  - month spend and month net
  - transaction, budget, goal, and IPO counts
  - portfolio value
  - budget pressure
  - goal progress
  - recent transactions
- Adds a quick income/expense transaction directly into the open MyWallet app tab
- Includes an automation launchpad foundation for future MeroShare/CDSC workflows
- Can trigger MeroShare IPO apply and allotment-result checks from the extension by driving the user's own MeroShare browser tab
- Uses safe DOM rendering in the popup instead of injecting wallet text as HTML
- Lets you save a preferred MyWallet app URL for local development or production shortcuts

## How it works

1. The MyWallet app mounts a client-side bridge component.
2. The extension content script sends requests into the page with `window.postMessage`.
3. The app responds with snapshot data or performs a transaction write using the existing wallet store.

This means:

- wallet data stays on the user's machine
- the extension does not need to decrypt MyWallet local storage itself
- the extension works best when the MyWallet app is already open in a browser tab

## Automation foundation

The extension now also includes a background service worker and launch buttons for:

- `MeroShare`
- `CDSC IPO Result`
- future guided automation flows

Today these are launchpad actions only. The goal is to evolve this into:

- extension initiated browser flows
- guided MeroShare actions
- future Playwright/Selenium-style orchestration through extension-owned browser state and permissions

## Load it in Chrome or Edge

1. Open `chrome://extensions` or `edge://extensions`
2. Turn on `Developer mode`
3. Choose `Load unpacked`
4. Select the `browser-extension` folder in this repo

## Local development flow

1. Run MyWallet locally, for example:
   - `pnpm dev`
2. Open the MyWallet app in a tab, for example:
   - `http://localhost:3000`
3. Open the extension popup
4. Click `Refresh` if it does not auto-connect
5. If you run MyWallet on a custom local URL, open `Manage`, set the preferred app URL, then click `Save URL`

## Current limitations

- The extension expects an open MyWallet tab.
- The extension can only connect to origins declared in `manifest.json` host permissions.
- It currently supports:
  - `ping`
  - `getSnapshot`
  - `addTransaction`
  - `applyMeroShareIPO`
  - `checkIPOAllotment`
  - `getMeroShareAutomationContext`
- It also includes a background action layer for future automation entry points.
- MeroShare credentials still come from the open MyWallet app after an explicit user action, but IPO apply/check automation runs in the user's browser tab through the extension. This avoids production serverless/Puppeteer browser limits.
- It does not yet support side panel mode or deep dashboard editing.

## Good next steps

- add side panel support
- add quick budget and goal summaries
- add route shortcuts into specific app sections
- add MeroShare action hooks behind explicit user approval

## Optional Browserless backend

The MeroShare API routes can use Browserless for hosted Puppeteer/Chromium by setting one of:

- `BROWSERLESS_TOKEN`: builds `wss://production-sfo.browserless.io?token=...`
- `BROWSERLESS_REGION`: optional, for example `production-lon` or `production-ams`
- `BROWSERLESS_WS_ENDPOINT`: optional full WebSocket endpoint; overrides token/region

Keep these values server-side only. Never expose the Browserless token in the browser extension or client code.
