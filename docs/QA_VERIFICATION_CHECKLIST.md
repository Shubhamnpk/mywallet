# MyWallet QA Verification Checklist

Use this checklist after each lint/refactor batch to confirm behavior is still correct.

## 0) Pre-check (2 minutes)

- Run `pnpm typecheck` and confirm success.
- Run `pnpm test` and confirm success.
- Run `pnpm lint` and confirm no new errors.
- Start app with `pnpm dev`.

## 1) Session and Security Flow

- Open app in a fresh tab.
- If PIN is enabled, verify lock screen appears.
- Enter wrong PIN once:
  - Expected: clear error feedback appears; app remains locked.
- Enter correct PIN:
  - Expected: app unlocks and lands on dashboard.
- Simulate tab inactivity / refocus:
  - Expected: if session expired, lock screen appears again.

## 2) Settings Flow (Desktop and Mobile)

- Open `Settings`.
- Switch tabs: `Profile`, `Security`, `Notifications`, `MeroShare`, `Theme`, `Data`, `Accessibility`, `About`.
  - Expected: each tab renders correctly, no blank/looping state.
- Open `/settings?tab=security` directly in URL.
  - Expected: security section opens correctly.
- On mobile viewport:
  - Expected: mobile settings page opens; navigation back to main settings works.

## 3) Transaction Dialog (Critical)

- Open add transaction dialog.
- Create simple expense with wallet/direct flow:
  - Expected: transaction saved, success toast, dialog closes.
- Create expense with goal funding:
  - Expected: selected goal balance is used and transaction recorded.
- Create expense with debt funding:
  - Expected: debt balance increases, transaction completes.
- Create expense with credit funding:
  - Expected: credit balance updates and transaction completes.
- Create income transaction:
  - Expected: income appears in list and totals update.

## 4) Goal/Debt Shortfall Paths

- Trigger a goal shortfall (expense amount > selected goal balance).
  - Expected: shortfall dialog appears.
- Resolve with wallet/goal or debt option:
  - Expected: chosen path completes correctly and state resets.

## 5) Portfolio and Market Flow

- Open portfolio page.
- Verify items load with values/prices.
- Wait for auto refresh interval or trigger refresh action.
  - Expected: prices update without breaking selected view.
- Open stock/crypto detail modal.
  - Expected: details render and close correctly.
- Open IPO detail modal:
  - Expected: status/actions show correctly; no repeated auto-action loops.

## 6) PWA / Update Flow

- Open app and check install/update UI components.
- If update banner/dialog appears:
  - Expected: interaction works, no stuck state.
- If using install prompt:
  - Expected: prompt button visibility behaves correctly (no flicker loop).

## 7) Data Safety Checks

- Add one transaction, refresh page, confirm transaction persists.
- Check local storage dependent settings (e.g., number format) survive reload.
- Ensure no data unexpectedly resets when closing dialogs.

## 8) Visual/Console Sanity

- Open browser console during above flows.
- Expected:
  - No uncaught runtime exceptions.
  - No repeated render loops.
  - No failed network spam.

## 9) Quick Regression Matrix (Pass/Fail)

- [done ] Session lock/unlock
- [done ] Settings tab navigation
- [ ] Transaction create (income/expense)
- [done] Goal funding
- [done ] Debt funding
- [ ] Credit funding
- [ ] Portfolio load/refresh
- [ ] IPO modal actions
- [ ] PWA update/install UI
- [ ] Persistence after reload
- [ ] No runtime console errors

## 10) Release Gate Rule

Treat a cleanup batch as safe only if:

- all checks in sections 0 and 9 pass,
- no critical user flow regression is observed,
- and any intentional behavior change is documented.

