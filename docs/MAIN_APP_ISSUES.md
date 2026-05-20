# Main App Issues

This document lists the main issues found during the storage, sync, security, and architecture review. It is meant to be used as a practical triage checklist.

## Critical

- [ ] **`localStorage` is acting as the app database**
  - Core wallet data is stored as JSON blobs in `localStorage`.
  - This affects transactions, budgets, goals, portfolios, debts, scan history, tombstones, and pending offline data.
  - Risk: quota failures, UI blocking, no indexes, difficult migration, weak sync foundation.
  - Related files:
    - `lib/storage.ts`
    - `hooks/use-wallet-store.ts`

- [ ] **Data integrity hashing is shallow**
  - `DataIntegrityManager.generateDataHash()` uses `JSON.stringify(data, Object.keys(data).sort())`.
  - This can ignore nested financial fields when hashing.
  - Risk: changed transaction or portfolio details may not be detected correctly.
  - Related file:
    - `lib/data-integrity.ts`

- [ ] **Integrity save failures can be silently ignored**
  - `saveDataWithIntegrity()` retries data saving after an integrity failure and can still return `true`.
  - Risk: app believes data is safely saved while integrity metadata is stale or missing.
  - Related file:
    - `hooks/use-wallet-store.ts`

- [ ] **PIN/key rotation can break encrypted data**
  - `rotateMasterKey()` clears key metadata and creates a new key without re-encrypting existing encrypted wallet records.
  - Risk: existing encrypted user data can become unreadable.
  - Related file:
    - `lib/key-manager.ts`

- [ ] **Dropbox tokens are stored in raw `localStorage`**
  - Access and refresh tokens are saved directly in browser storage.
  - Risk: tokens can be stolen if an XSS vulnerability ever exists.
  - Related file:
    - `lib/dropbox.ts`

## High Priority

- [ ] **Dropbox merge conflict logic can choose the wrong record**
  - Merge logic falls back to fields like `date` when `updatedAt` is missing.
  - For financial records, `date` often means transaction date, not edit timestamp.
  - Risk: newer user changes can be overwritten by older remote data.
  - Related file:
    - `components/settings/data-settings.tsx`

- [ ] **Global wallet context causes broad rerenders**
  - The provider passes one large `walletData` object to the entire app.
  - Domain hooks still consume the same global context.
  - Risk: unrelated screens rerender when any wallet state changes.
  - Related files:
    - `contexts/wallet-data-context.tsx`
    - `hooks/use-wallet-data.ts`
    - `hooks/use-portfolio-data.ts`
    - `components/portfolio/portfolio-list.tsx`

- [ ] **Clear-all-data does not clear all storage classes**
  - Current clear flow clears `localStorage`, `sessionStorage`, and cookies.
  - It does not clear IndexedDB, CacheStorage, or service worker state.
  - Risk: future IndexedDB data or cached app state may remain after a reset.
  - Related file:
    - `hooks/use-wallet-store.ts`

- [ ] **Full-array saves instead of record-level saves**
  - Many operations rewrite entire arrays such as transactions or share transactions.
  - Risk: slow saves, quota pressure, harder conflict resolution, harder sync.
  - Related file:
    - `hooks/use-wallet-store.ts`

- [ ] **Sync data lacks consistent timestamps**
  - Not every entity has reliable `createdAt`, `updatedAt`, and `deletedAt`.
  - Risk: server sync and Dropbox merge cannot reliably detect the newest record.
  - Related files:
    - `types/wallet.ts`
    - `hooks/use-wallet-store.ts`
    - `components/settings/data-settings.tsx`

## Medium Priority

- [ ] **Suggestion dropdowns use fragile blur timeouts**
  - Several inputs use `setTimeout(..., 120)` on blur to hide suggestions.
  - Risk: flicker, missed clicks, unreliable behavior on slower devices.
  - Related files:
    - `components/portfolio/modals/add-transaction-modal.tsx`
    - `components/portfolio/modals/edit-transaction-modal.tsx`
    - `components/portfolio/overview-stock-search.tsx`

- [ ] **Some network/API failures are swallowed**
  - Several API calls catch errors without showing user-facing feedback.
  - Risk: users see empty or loading states without knowing what failed.
  - Related files:
    - `components/portfolio/modals/add-transaction-modal.tsx`
    - `components/dashboard/scanner-modal.tsx`
    - `components/dashboard/qr-code-scanner.tsx`
    - `app/api/nepse/*`

- [ ] **Native `confirm()` dialogs remain in parts of the app**
  - Native browser dialogs break the design system and are harder to control.
  - Risk: inconsistent UX and weak accessibility.
  - Related files:
    - `components/categories/categories-management.tsx`
    - `components/goals/goals-list.tsx`
    - `components/tools/shift-tracker.tsx`

- [ ] **Migration code writes legacy `_v2` keys instead of current app keys**
  - Older migration code stores data under keys like `transactions_v2`.
  - Current app loading expects keys like `transactions`.
  - Risk: legacy migration may appear successful but not load migrated data.
  - Related file:
    - `lib/migration.ts`

- [ ] **Many `catch` blocks are empty**
  - Empty catches hide real failures during storage, sync, API, and UI operations.
  - Risk: bugs become hard to diagnose and users get no recovery path.
  - Related areas:
    - API routes
    - storage helpers
    - scanner flows
    - Dropbox flows
    - market data flows

## Lower Priority / Cleanup

- [ ] **Large components and hooks are difficult to maintain**
  - `use-wallet-store.ts` and `portfolio-list.tsx` carry many unrelated responsibilities.
  - Risk: slower development, more regressions, harder tests.
  - Related files:
    - `hooks/use-wallet-store.ts`
    - `components/portfolio/portfolio-list.tsx`

- [ ] **Heavy use of `any` weakens TypeScript safety**
  - Several financial, debt, API, and settings paths use `any`.
  - Risk: runtime errors that TypeScript could have caught.
  - Related areas:
    - debt/credit components
    - settings import/export
    - MeroShare API routes
    - portfolio modals

- [ ] **Multiple storage access patterns exist**
  - Some code uses `lib/storage.ts`; other code calls `localStorage` directly.
  - Risk: inconsistent encryption, inconsistent migration, harder IndexedDB transition.
  - Related areas:
    - hooks
    - settings
    - dashboard components
    - security helpers

- [ ] **Quota handling is incomplete**
  - Some storage paths detect quota errors, but many direct `localStorage` calls do not.
  - Risk: user data save failures may be silent.
  - Related files:
    - `hooks/use-wallet-store.ts`
    - `lib/storage.ts`
    - settings and scanner components

## Suggested Fix Order

1. Fix deep data integrity hashing.
2. Fix key rotation so encrypted records are re-encrypted safely.
3. Add a storage adapter layer.
4. Move core wallet data to IndexedDB.
5. Add consistent timestamps to all syncable entities.
6. Fix Dropbox merge conflict rules.
7. Move Dropbox tokens out of raw `localStorage`.
8. Split wallet context by domain.
9. Replace full-array saves with record-level writes.
10. Improve user-facing errors for network, storage, and sync failures.

