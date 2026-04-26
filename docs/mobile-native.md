# Native Mobile Setup

This project now includes a production-oriented Capacitor integration for Android and iOS.

## Architecture

- The existing Next.js app remains the primary application.
- Native mobile shells load the deployed app URL via `CAPACITOR_SERVER_URL`.
- Biometric unlock on native uses:
  - `@aparajita/capacitor-biometric-auth`
  - `@aparajita/capacitor-secure-storage`
- Web keeps the existing WebAuthn-based fallback.

## Why remote URL mode

This app currently depends on live Next.js API routes under `app/api/**`, so it is not ready for a fully bundled static mobile build yet. Using a deployed URL keeps those server routes working while still letting the app use native biometrics and OS-backed secure storage.

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

## Native security behavior

- Android stores the protected PIN using the Android Keystore-backed secure storage plugin.
- iOS stores the protected PIN in Keychain with `whenPasscodeSetThisDeviceOnly`.
- Native unlock always requires a local biometric or device credential prompt before the PIN is read.

## iOS note

Add `NSFaceIDUsageDescription` to `ios/App/App/Info.plist` after generating the iOS project. Suggested value:

`MyWallet uses Face ID to unlock your encrypted wallet PIN.`
