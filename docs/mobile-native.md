# Native Mobile Setup

This project now includes a production-oriented Capacitor integration for Android and iOS.

## Architecture

- The existing Next.js app remains the primary application.
- Native mobile shells load the deployed app URL via `CAPACITOR_SERVER_URL`.
- Biometric unlock now relies on the same in-app WebAuthn/local-storage flow used by the web app.

## Why remote URL mode

This app currently depends on live Next.js API routes under `app/api/**`, so it is not ready for a fully bundled static mobile build yet. Using a deployed URL keeps those server routes working while still letting the app run inside native mobile shells.

## Required environment variables

- `CAPACITOR_SERVER_URL`
  Example: `https://your-production-domain.example`
- `CAPACITOR_APP_ID`
  Optional. Defaults to `com.mywallet.app`.
- `CAPACITOR_APP_NAME`
  Optional. Defaults to `MyWallet`.

## Commands

- `pnpm cap:sync`
- `pnpm cap:open:android`
- `pnpm cap:open:ios`
- `pnpm mobile:android`
- `pnpm mobile:ios`

## Biometric note

- Biometric unlock uses the app's local biometric setup flow when supported by the runtime.
- No native Capacitor biometric or secure-storage plugins are required.
