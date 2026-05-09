# Security Policy

## Supported Versions

MyWallet is actively supported on the latest published release.

| Version | Supported |
| --- | --- |
| `2.1.x` | Yes |
| `< 2.1.0` | No |

Security fixes are generally shipped in the newest stable version only. If you report an issue affecting an older release, we may ask you to verify it on the latest version before we investigate further.

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Use one of these paths instead:

1. Use GitHub's private vulnerability reporting feature from the repository's **Security** tab, if it is available.
2. If private reporting is not available, contact the maintainers privately through GitHub before sharing any technical details publicly.

When reporting a vulnerability, please include:

- A clear description of the issue and why it matters.
- The affected version(s), platform(s), and environment.
- Steps to reproduce the problem.
- A proof of concept, logs, screenshots, or sample payloads if relevant.
- Any suggested mitigation or fix, if you have one.

Please avoid:

- Posting exploit details in public issues, discussions, or pull requests.
- Accessing, modifying, or exfiltrating data that does not belong to you.
- Running destructive tests against production services or other users.

## What to Expect

We will try to:

- Acknowledge receipt within `7` days.
- Triage and validate the report as quickly as possible.
- Keep you informed if we need more details or when severity changes.
- Credit you for the report if a fix ships and you would like attribution.

Response times may vary depending on the complexity of the issue and maintainer availability.

## Scope

This repository includes:

- The Next.js web application.
- Capacitor-based Android and iOS shells.
- Local security features such as PIN protection, biometric unlock flows, encrypted storage, and session handling.
- Related API routes and backup/import flows contained in this repository.

Issues are more likely to be considered in scope when they affect:

- Authentication or session bypass.
- Exposure of sensitive financial or personal data.
- Encryption, credential, token, or backup handling weaknesses.
- Privilege escalation or unauthorized actions.
- Vulnerabilities in shipped app code or configuration.

## Out of Scope

The following are usually out of scope unless they lead to a real, user-impacting compromise:

- Best-practice suggestions without a demonstrable security impact.
- Denial-of-service reports that require unrealistic local access or non-default developer setup.
- Issues only present in outdated, unsupported versions.
- Vulnerabilities in third-party services outside this repository unless MyWallet is using them insecurely.
- Social engineering, phishing, spam, or physical device access scenarios without an app-specific bypass.

## Disclosure

Please allow time for investigation and remediation before public disclosure.

After a fix is available, we may:

- Publish the fix in a normal release.
- Add release notes or changelog entries.
- Share limited technical details once users have had a reasonable chance to update.

Thank you for helping keep MyWallet and its users safe.
