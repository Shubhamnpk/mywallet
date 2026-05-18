# MyWallet Storage & Sync Roadmap

This roadmap documents the current storage findings, the recommended move to IndexedDB, and the next-version features that should be built around reliable offline-first wallet data.

## Executive Summary

MyWallet currently works as a browser-first app where most user data is stored in `localStorage`, with selected sensitive keys encrypted before being saved. This has carried the app well so far, but the product now has enough financial, portfolio, debt, notification, backup, and offline data that `localStorage` is becoming the wrong foundation.

The most important storage upgrade for the next major version is:

> Move core wallet data from `localStorage` to IndexedDB, keep `localStorage` only for small preferences and boot flags, then add one server-side synchronization layer for online backup and cross-device recovery.

## Current Findings

### Current Storage Methods

- `localStorage` is the main app database.
- Sensitive keys are encrypted through `lib/storage.ts` before being saved.
- AES-GCM encryption is handled by `lib/security.ts`.
- Key derivation and key cache behavior live in `lib/key-manager.ts`.
- Export/import creates JSON backup files from in-memory wallet state.
- Dropbox is used as an optional backup/sync destination.
- CacheStorage is used by the PWA/service worker for app shell and asset caching.
- Upstash Redis is used only for push notification subscriptions and push job health.
- Browser extension settings use `chrome.storage.sync` and `chrome.storage.local`.
- There is no app-owned IndexedDB database yet.

### Current Pain Points

- `localStorage` is synchronous and can block the UI during larger reads/writes.
- Browser quota is limited and can fail as transaction, portfolio, scan, and backup data grows.
- Full arrays are saved repeatedly instead of record-level updates.
- There are no indexes for searching transactions, filtering by date, portfolio lookup, or sync queries.
- Offline pending queues and tombstones are stored as JSON blobs, which makes conflict handling harder.
- Dropbox tokens are stored in raw `localStorage`, which is not ideal for a financial app.
- Data integrity records are useful, but the storage layer is not transaction-safe.

## Recommended Storage Architecture

Use a hybrid storage model:

| Data Type | Recommended Storage |
| --- | --- |
| Transactions | IndexedDB |
| Budgets | IndexedDB |
| Goals | IndexedDB |
| Categories | IndexedDB |
| Debt and credit accounts | IndexedDB |
| Debt/credit history | IndexedDB |
| Portfolios | IndexedDB |
| Share transactions | IndexedDB |
| SIP plans and execution state | IndexedDB |
| Deleted records/tombstones | IndexedDB |
| Pending offline sync queue | IndexedDB |
| Receipt and QR scan history | IndexedDB |
| Theme, number format, compact mode | `localStorage` |
| Session-only auth flags | `sessionStorage` or memory |
| Encryption salts and non-secret metadata | `localStorage` is acceptable |
| Dropbox refresh/access tokens | Server-side session or encrypted IndexedDB |
| PWA shell/assets | CacheStorage |
| Push subscriptions | Upstash Redis or future app backend |

## IndexedDB Checklist

### Phase 1: Storage Adapter Foundation

- [ ] Create a storage adapter interface, for example `WalletStorageAdapter`.
- [ ] Keep existing `localStorage` behavior behind a `LocalStorageAdapter`.
- [ ] Add an `IndexedDbStorageAdapter`.
- [ ] Make app code call the adapter instead of direct `localStorage` for core wallet data.
- [ ] Keep direct `localStorage` only for simple preferences.
- [ ] Add typed read/write methods for each wallet domain.
- [ ] Add tests for read, write, delete, export, import, and migration behavior.

### Phase 2: IndexedDB Schema

- [ ] Create database name: `mywallet`.
- [ ] Create schema version: `1`.
- [ ] Add object store: `transactions`.
- [ ] Add object store: `budgets`.
- [ ] Add object store: `goals`.
- [ ] Add object store: `categories`.
- [ ] Add object store: `debtAccounts`.
- [ ] Add object store: `creditAccounts`.
- [ ] Add object store: `debtCreditTransactions`.
- [ ] Add object store: `portfolios`.
- [ ] Add object store: `portfolioItems`.
- [ ] Add object store: `shareTransactions`.
- [ ] Add object store: `settings`.
- [ ] Add object store: `tombstones`.
- [ ] Add object store: `syncQueue`.
- [ ] Add object store: `scanHistory`.
- [ ] Add object store: `metadata`.

### Phase 3: Required Indexes

- [ ] `transactions`: `date`, `type`, `category`, `updatedAt`, `deletedAt`.
- [ ] `budgets`: `period`, `category`, `updatedAt`, `deletedAt`.
- [ ] `goals`: `status`, `targetDate`, `updatedAt`, `deletedAt`.
- [ ] `debtAccounts`: `accountType`, `updatedAt`, `deletedAt`.
- [ ] `debtCreditTransactions`: `accountId`, `accountType`, `date`, `updatedAt`.
- [ ] `portfolios`: `name`, `updatedAt`, `deletedAt`.
- [ ] `portfolioItems`: `portfolioId`, `symbol`, `assetType`, `updatedAt`.
- [ ] `shareTransactions`: `portfolioId`, `symbol`, `date`, `type`, `updatedAt`, `deletedAt`.
- [ ] `tombstones`: `entity`, `recordId`, `deletedAt`.
- [ ] `syncQueue`: `entity`, `operation`, `createdAt`, `status`.

### Phase 4: Migration From localStorage

- [ ] Detect whether IndexedDB migration has already completed.
- [ ] Read existing encrypted and plaintext `localStorage` keys.
- [ ] Decrypt sensitive keys using the current key manager.
- [ ] Validate imported arrays before inserting into IndexedDB.
- [ ] Insert data into IndexedDB in transactions.
- [ ] Save a migration report into `metadata`.
- [ ] Keep old `localStorage` data temporarily until verification succeeds.
- [ ] After successful verification, mark migration complete.
- [ ] Add recovery flow if migration fails.
- [ ] Add a manual "retry migration" developer/debug action.

### Phase 5: Encryption Model

- [ ] Keep AES-GCM encryption for sensitive data.
- [ ] Decide whether to encrypt per record or per object store payload.
- [ ] Prefer record-level encryption for transactions, portfolios, debts, and scan history.
- [ ] Keep searchable non-sensitive indexes outside encrypted payloads when needed.
- [ ] Never store the raw PIN.
- [ ] Keep the derived `CryptoKey` in memory only.
- [ ] Move Dropbox token storage away from raw `localStorage`.
- [ ] Add backup restore tests for encrypted IndexedDB data.

### Phase 6: App Integration

- [ ] Replace core reads in `use-wallet-store.ts` with adapter reads.
- [ ] Replace core writes in `use-wallet-store.ts` with adapter writes.
- [ ] Save individual changed records where possible instead of rewriting full arrays.
- [ ] Update export to read from IndexedDB.
- [ ] Update import to write to IndexedDB.
- [ ] Update clear-all-data to clear IndexedDB, CacheStorage, `localStorage`, and `sessionStorage`.
- [ ] Add storage health check in Settings.
- [ ] Add "download migration backup" before major migration.

### Phase 7: Verification

- [ ] Test fresh install.
- [ ] Test existing localStorage user migration.
- [ ] Test encrypted wallet migration after PIN unlock.
- [ ] Test failed unlock path.
- [ ] Test quota behavior with large data.
- [ ] Test offline mode.
- [ ] Test export and restore.
- [ ] Test Dropbox backup after IndexedDB migration.
- [ ] Test PWA installed mode.
- [ ] Test Android/iOS Capacitor shell.
- [ ] Test browser extension compatibility.

## Server-Side Synchronization Roadmap

The first sync goal should be simple and dependable:

> One server-side synchronization system that activates when the app is online.

### Sync Principles

- Local IndexedDB remains the source of truth while offline.
- Server sync runs only when online.
- Every synced record has `id`, `createdAt`, `updatedAt`, and optional `deletedAt`.
- Deletes use tombstones instead of hard deletion.
- Sync is incremental, not full backup every time.
- Conflicts should be visible and recoverable.

### Sync Phases

- [ ] Add `updatedAt` and `deletedAt` consistently to all core entities.
- [ ] Add a `syncQueue` store in IndexedDB.
- [ ] On every local mutation, enqueue a sync operation.
- [ ] Add background sync trigger when online.
- [ ] Add manual "Sync now" button in Settings.
- [ ] Add server endpoint: upload local changes.
- [ ] Add server endpoint: fetch remote changes since timestamp.
- [ ] Add conflict strategy: last-write-wins for simple settings, manual review for financial records.
- [ ] Add sync status UI: last synced, pending changes, failed changes.
- [ ] Add retry with exponential backoff.
- [ ] Add sync audit log for debugging.

### Suggested Backend Shape

Start with a small backend table/model per entity or a generic sync table:

- `users`
- `devices`
- `wallet_records`
- `sync_events`
- `backup_snapshots`

Recommended minimum fields:

- `userId`
- `deviceId`
- `entity`
- `recordId`
- `payload`
- `payloadVersion`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `lastModifiedByDeviceId`

## Next Version Feature Ideas

These features fit naturally with the storage upgrade and are worth considering for the next major version.

### Data Reliability

- [ ] Storage health dashboard in Settings.
- [ ] Migration status page.
- [ ] Automatic local recovery snapshot before destructive imports.
- [ ] Backup history with restore points.
- [ ] Data integrity repair suggestions.
- [ ] Duplicate transaction detector.
- [ ] Orphaned portfolio/share transaction repair tool.

### Sync & Backup

- [ ] Server-side sync when online.
- [ ] Multi-device sync status.
- [ ] Device list and revoke device access.
- [ ] Encrypted cloud backup snapshots.
- [ ] Conflict review screen.
- [ ] Dropbox as backup destination, server sync as primary sync.

### Offline-First UX

- [ ] Clear offline indicator with pending changes count.
- [ ] Sync queue viewer for advanced users.
- [ ] Retry failed sync action.
- [ ] Better offline import/export handling.
- [ ] Offline receipt scan queue.

### Security

- [ ] Move Dropbox tokens out of raw `localStorage`.
- [ ] Add storage security audit screen.
- [ ] Add "lock after sync" option.
- [ ] Add emergency recovery export flow.
- [ ] Add optional passphrase-based backup encryption separate from wallet PIN.

### Performance

- [ ] Record-level saves instead of full-array saves.
- [ ] Indexed transaction queries by date range.
- [ ] Indexed portfolio queries by portfolio and symbol.
- [ ] Lazy-load heavy portfolio/market data only when needed.
- [ ] Split wallet context by domain to reduce rerenders.

### Developer Quality

- [ ] Add storage adapter tests.
- [ ] Add migration tests with real old localStorage fixtures.
- [ ] Add sync conflict tests.
- [ ] Add large dataset performance tests.
- [ ] Add a seeded demo database generator.

## Suggested Implementation Order

1. Add `WalletStorageAdapter` interface.
2. Wrap current `localStorage` behavior in the adapter without changing app behavior.
3. Add IndexedDB adapter and tests.
4. Add migration from `localStorage` to IndexedDB.
5. Switch core wallet reads/writes to IndexedDB.
6. Update export/import and Dropbox backup to read/write through the adapter.
7. Add storage health UI.
8. Add server-side sync queue.
9. Add online sync endpoints.
10. Add conflict review and multi-device status.

## Resource Notes

Useful resources for implementation:

- MDN IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN Storage quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Dexie documentation: https://dexie.org/docs/
- idb documentation: https://github.com/jakearchibald/idb
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- Background Sync concepts: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API

## Decision

For MyWallet's next storage version:

- Use IndexedDB for the actual wallet database.
- Keep `localStorage` for small preferences only.
- Keep CacheStorage for PWA assets.
- Keep Redis or future backend storage for server-owned push/sync data.
- Add one server-side synchronization system for online sync and cross-device recovery.
- Treat Dropbox as backup/export, not the primary live database.
