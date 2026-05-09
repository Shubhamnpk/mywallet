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

## Current limitations

- The extension expects an open MyWallet tab.
- It currently supports:
  - `ping`
  - `getSnapshot`
  - `addTransaction`
- It also includes a background action layer for future automation entry points.
- It does not yet manage MeroShare automation.
- It does not yet support side panel mode or deep dashboard editing.

## Good next steps

- add side panel support
- add quick budget and goal summaries
- add route shortcuts into specific app sections
- add MeroShare action hooks behind explicit user approval
