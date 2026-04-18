# Changelog

## [2.0.1](https://github.com/Shubhamnpk/mywallet/compare/mywallet-v2.0.0...mywallet-v2.0.1) (2026-04-18)


### Bug Fixes

* **ui:** improve decimal number formatting and precision ([50a704a](https://github.com/Shubhamnpk/mywallet/commit/50a704a79a44780c5d66c0a92d527ac9c0f068e5))

## [2.0.0](https://github.com/Shubhamnpk/mywallet/compare/mywallet-v1.3.5...mywallet-v2.0.0) (2026-04-17)


### ⚠ BREAKING CHANGES

* **debt:** Allocation type now includes "fastdebt" option for transactions related to fast debt accounts.
* **backup:** Backup import now requires explicit selection of data types to import, preventing accidental overwrites of existing data.
* **ui:** Time wallet stats are now conditionally displayed based on enablement, potentially affecting UI layout for users with incomplete work data.
* **ui:** Debt allocation behavior changed from adding to debt balance to reducing it via payments, affecting how expenses are allocated to debt accounts.
* **ui:** Transactions list no longer defaults to last 7 days; shows all transactions unless filtered
* **goals:** Achievements tab removed from goals list; access now through user settings
* **ui:** None
* **ui:** Onboarding flow now includes wallet type selection, requiring users to choose between timed and normal wallet modes.

### Features

* add btc news, top movers, biometric setup ([58e756e](https://github.com/Shubhamnpk/mywallet/commit/58e756e7a891ceedbeeb30a33bf85ec2c5327b98))
* add CI workflow, ESLint configuration, and utility functions with tests ([2a78c9e](https://github.com/Shubhamnpk/mywallet/commit/2a78c9e47ebd6bb9bfd960736d91f9bfb3525a6f))
* Add comprehensive NEPSE data API endpoints and MeroShare settings with related configurations. ([b2a7014](https://github.com/Shubhamnpk/mywallet/commit/b2a7014b052ff40ee9a398884436dbdfc7ede568))
* add data settings component with Dropbox integration and backup management capabilities ([03d9c15](https://github.com/Shubhamnpk/mywallet/commit/03d9c153db37fdefbc97ef047697168780566600))
* add income/expense range toggle and optimize balance calculations ([f6b50aa](https://github.com/Shubhamnpk/mywallet/commit/f6b50aac667a473485d775a6c99d9dcf5ea0c977))
* add MeroShare integration for automated IPO applications ([99a1e6f](https://github.com/Shubhamnpk/mywallet/commit/99a1e6ff057d7e6cd7eba176cc4222f292ab6402))
* Add PortfolioList component for comprehensive portfolio management, including holdings, transactions, IPOs, and market data. ([38ecb60](https://github.com/Shubhamnpk/mywallet/commit/38ecb60a09267bd4ad6ddad08f943b1e06bc1059))
* add SIP plan management functionality ([af349bc](https://github.com/Shubhamnpk/mywallet/commit/af349bc8c22de04d7e6715c99a0e6c22eb33425b))
* add support for enrolling multiple share transactions in SIP plans and enhance SIP setup modal with saving state management ([137031e](https://github.com/Shubhamnpk/mywallet/commit/137031e11f176a571d88460b1a27e9f4abbba770))
* add transaction history dialog to budgets list ([04dae9b](https://github.com/Shubhamnpk/mywallet/commit/04dae9b075f4be7f268ad07cab504ef1af993859))
* **api:** add nepse market status API and wallet data integration ([861b2d2](https://github.com/Shubhamnpk/mywallet/commit/861b2d24d6640a630daffa5a7c08bf743a66626c))
* **backup:** enhance data import with selective options and improved error handling ([48bbe15](https://github.com/Shubhamnpk/mywallet/commit/48bbe155f18f8742ae4f9ca80bcaf329617d2f34))
* Configure PWA service worker with `skipWaiting` and `clientsClaim`, add PWA source URL to manifest, and remove ESLint/TypeScript build ignores. ([76c9e3c](https://github.com/Shubhamnpk/mywallet/commit/76c9e3cd1c44d9d7c516b64fdedf1dcbdd689d9b))
* **debt:** add fast debt feature for accounts without interest or minimum payments ([0f3effa](https://github.com/Shubhamnpk/mywallet/commit/0f3effa340f030c477c4bd2967de4f5de7959b60))
* enhance MeroShare integration and data management ([40f8283](https://github.com/Shubhamnpk/mywallet/commit/40f828340f2a083113157db4eaa5dacf1cfa97e4))
* enhance onboarding flow, welcome page, and app metadata ([fd51044](https://github.com/Shubhamnpk/mywallet/commit/fd510444f78ea3378a64929b17900b537af0c33e))
* enhance portfolio color handling with sector-based color mapping and utilities ([a6e67d6](https://github.com/Shubhamnpk/mywallet/commit/a6e67d69f27ed3b9201e287c02f4741796ef4ec1))
* enhance portfolio list and stock detail modal with new mover data and improved UI elements ([ce2c013](https://github.com/Shubhamnpk/mywallet/commit/ce2c013f9da4a52f582cfc2dfeaf611cfa92185c))
* enhance SIP functionality with transaction enrollment and due date calculations ([233bddd](https://github.com/Shubhamnpk/mywallet/commit/233bdddb76cb486d417a09c2e29b49cb726bc3e8))
* enhance transaction management and UI components ([1bcdf65](https://github.com/Shubhamnpk/mywallet/commit/1bcdf65f4e300b1f0b5693a84c0ec346f71335cf))
* enhance wallet app with notifications, goals tracking, and data management ([13def72](https://github.com/Shubhamnpk/mywallet/commit/13def72c13c0e0bc5dc7d52424475a8a6cee11fc))
* enhance wallet management and debt/credit features ([8121b52](https://github.com/Shubhamnpk/mywallet/commit/8121b5204a521ad3e51dd13f9170a4830e1ee62f))
* **goals:** enhance goal creation dialog with categories, priorities, and auto-contribution features ([68d8121](https://github.com/Shubhamnpk/mywallet/commit/68d8121ee1c1f53011d028378ff402c34e8d2e23))
* **hooks:** improve notification handling and data integrity ([0a9048c](https://github.com/Shubhamnpk/mywallet/commit/0a9048cd9e80d0ce9665ac7cd919390975133bd0))
* Implement a floating action button with quick access to transaction creation, currency conversion, receipt scanning, voice input, calculator, and gaming. ([c4344d2](https://github.com/Shubhamnpk/mywallet/commit/c4344d2dcfff894488c38e3c5db55e6883d7b0a1))
* implement bill reminder system and add UI components for tracking financial goals and progress ([b67744d](https://github.com/Shubhamnpk/mywallet/commit/b67744d48f24ea0cf78d5680502d7b66ebbe0f7a))
* implement bill reminders and enhance notification system ([78e55a2](https://github.com/Shubhamnpk/mywallet/commit/78e55a2ceaf7265253d8c41f867f102254afe2e3))
* implement biometric key management for PIN wrapping and unwrapping. ([9c74c99](https://github.com/Shubhamnpk/mywallet/commit/9c74c99b14efb6cfd74ed59a677b927aaf00f644))
* Implement core portfolio management UI, wallet data context, session guard, and sound utilities. ([ad036eb](https://github.com/Shubhamnpk/mywallet/commit/ad036eb55cec6e13f0b96599c88a8cb4118f8f23))
* Implement core wallet dashboard with comprehensive financial management features and NEPSE market data integration. ([2ddf882](https://github.com/Shubhamnpk/mywallet/commit/2ddf882cab3df7241e4b41fddfe64b3ffc8bd117))
* implement currency utility module, integrate PWA service worker, and add dashboard balance card components ([c14215b](https://github.com/Shubhamnpk/mywallet/commit/c14215b354abd615f2088e9304b5f2ee8fb5cf0b))
* implement Dropbox OAuth2 authentication flow with PKCE and file management utilities ([4b7f104](https://github.com/Shubhamnpk/mywallet/commit/4b7f10488e9e8f8c8fa89cad204d81054c13d60b))
* implement goal challenge functionality with investment options, penalty tracking, and enhanced progress visualization ([1accf98](https://github.com/Shubhamnpk/mywallet/commit/1accf9836f591423868482cc82f26666a134312d))
* Implement PortfolioList component for managing and displaying user investment portfolios, including stocks, crypto, transactions, and IPOs. ([6364058](https://github.com/Shubhamnpk/mywallet/commit/63640582e8fe8c3606c8503092fe91a5fc852631))
* normalize stock symbols across components and introduce utility for alias handling ([315490a](https://github.com/Shubhamnpk/mywallet/commit/315490a2ae157752955c22581fbfd1e95d04ebca))
* **portfolio:** add Bitcoin news and enhance portfolio features ([1ce851c](https://github.com/Shubhamnpk/mywallet/commit/1ce851c9dd3a8a410e709d03d15f139a6468cde4))
* **portfolio:** add market snapshot and notification center ([ebffebc](https://github.com/Shubhamnpk/mywallet/commit/ebffebc9b7bfdeeaa2d4f74f89a2d2b21dc7b9aa))
* **portfolio:** add reserved IPO share support ([319d915](https://github.com/Shubhamnpk/mywallet/commit/319d915d5eca1619fef240caeaeb56d37169264f))
* **portfolio:** implement price caching, auto-refresh and responsive design ([f425673](https://github.com/Shubhamnpk/mywallet/commit/f425673c0115c45754db67073691142505b182cf))
* **pwa:** enhance update mechanism with notifications and auto-apply ([a264d5b](https://github.com/Shubhamnpk/mywallet/commit/a264d5b163880f84c1a839e153bce6fa845cd8ce))
* refactor SIP setup modal and stock detail modal for improved transaction handling and user experience ([0649166](https://github.com/Shubhamnpk/mywallet/commit/0649166f79882c9747903a4ca33eda7c2239f490))
* **sync:** add Dropbox backup and tombstone sync ([089ecc8](https://github.com/Shubhamnpk/mywallet/commit/089ecc8dc8eea7476d61a1adf78b3e7e433c178d))
* **ui:** add decimal input mode to transaction amount input ([6a801e6](https://github.com/Shubhamnpk/mywallet/commit/6a801e618282363d77c2b320cf0da0f0a0b2f103))
* **ui:** add gaming place feature and enhance QR scanner ([52e58f3](https://github.com/Shubhamnpk/mywallet/commit/52e58f3623484ea8ca299e2cb2947b2bdf035526))
* **ui:** add google site verification meta tag ([aa12b4a](https://github.com/Shubhamnpk/mywallet/commit/aa12b4a4da53ef21d4b2f94252441d3d598de01f))
* **ui:** add loading state and error handling for debt addition ([6449e5c](https://github.com/Shubhamnpk/mywallet/commit/6449e5cf95d56d1cf8be6ae10a8e70b07e222789))
* **ui:** add locale support for currency formatting ([ff617f1](https://github.com/Shubhamnpk/mywallet/commit/ff617f1f6a58b3d479a0399a8d65dd814030ce32))
* **ui:** add share functionality to dashboard header ([099921a](https://github.com/Shubhamnpk/mywallet/commit/099921ab730f54462f13407a747e55d0083467a3))
* **ui:** add theme toggle to dashboard header ([7ab18f1](https://github.com/Shubhamnpk/mywallet/commit/7ab18f1c840cd7267e40d58a5d89fc7bc038f184))
* **ui:** enhance achievements, budgets, goals, and categories UI components ([08f944a](https://github.com/Shubhamnpk/mywallet/commit/08f944a3d20f2840013f21f7c367839060974943))
* **ui:** enhance mobile modal design and notification system ([8006cf4](https://github.com/Shubhamnpk/mywallet/commit/8006cf42cc1b5fe3c42c3e0f909f5468fc290c57))
* **ui:** enhance onboarding flow and theme customization ([9aa2fc1](https://github.com/Shubhamnpk/mywallet/commit/9aa2fc15f7c6e2b870f51dca6fbea5e62a72d68c))
* **ui:** enhance onboarding schedule step with improved layout and guidance ([658f052](https://github.com/Shubhamnpk/mywallet/commit/658f052cc15a2bfb04a681db455828e5d702177d))
* **ui:** enhance onboarding theming and add search highlighting in settings ([b516a8d](https://github.com/Shubhamnpk/mywallet/commit/b516a8d9908e9689cbcc69f603c38d4c193ad666))
* **ui:** enhance QR scanner and settings with new features ([3a7aa4b](https://github.com/Shubhamnpk/mywallet/commit/3a7aa4bbd1f235a24bdbfbdb529f96636881d585))
* **ui:** enhance SEO metadata and structured data for app pages ([7638884](https://github.com/Shubhamnpk/mywallet/commit/7638884a84229d3dffa04a48c37df70b91324be4))
* **ui:** enhance settings with cancel functionality and updated number formats ([b74cada](https://github.com/Shubhamnpk/mywallet/commit/b74cadaaef8846d20c5df5103f4f0c9d785b0f5d))
* **ui:** enhance share modal and fix debt allocation logic ([c58a2f4](https://github.com/Shubhamnpk/mywallet/commit/c58a2f4f3185fb3805b597e88c179f8828e4c730))
* update layout and components for improved developer experience and functionality ([7c5f253](https://github.com/Shubhamnpk/mywallet/commit/7c5f2534eed6efd2b5ccb3cdb2a1f0ad7da927e2))
* update URLs to use new deployment domain ([ab2a37d](https://github.com/Shubhamnpk/mywallet/commit/ab2a37d05b485c159b08f00f588e5d02d5d48f7f))
* update URLs to use new deployment domain ([9d2dde2](https://github.com/Shubhamnpk/mywallet/commit/9d2dde2c61b95d2a250ef867d42cea8ee65a11cb))
* **v1.3.6:** add SIP enrollment flow, goal challenge tracking, stock symbol normalization, and portfolio UI enhancements ([41250b7](https://github.com/Shubhamnpk/mywallet/commit/41250b748ffa1ad9c84ea52ca0207bfa1d16c03a))


### Bug Fixes

* adjust modal styling and layout for better responsiveness ([75d4692](https://github.com/Shubhamnpk/mywallet/commit/75d4692067acc05d993a3c5dd9e099f16dd751db))
* correct reserved share badge condition and add dividend history to stock modal ([54ffbb6](https://github.com/Shubhamnpk/mywallet/commit/54ffbb6c4898220ffaebe319dd31def22dd65957))
* correct reserved share badge condition and add dividend history to stock modal ([9abe1e3](https://github.com/Shubhamnpk/mywallet/commit/9abe1e35034e1062f53fcf24275d3cf49c4d0e09))
* simplify developer menu rendering logic ([ec80509](https://github.com/Shubhamnpk/mywallet/commit/ec805097f2673d79bfea5748fcbd4cac3f51a2b8))
* **ui:** improve amount input validation and mobile responsiveness ([d8bf735](https://github.com/Shubhamnpk/mywallet/commit/d8bf735db477a210e9747e4f99c75e2a2f523965))
* **ui:** improve amount input validation and mobile responsiveness ([0902b21](https://github.com/Shubhamnpk/mywallet/commit/0902b21c46da1fcfffca675de4ff303ac9d55181))


### Code Refactoring

* **ui:** restructure goals and transactions list layouts ([40b3243](https://github.com/Shubhamnpk/mywallet/commit/40b324306d439ba18c28309346a15d322db3d38f))

## Changelog

Notable changes are added here by [Release Please](https://github.com/googleapis/release-please) when you merge its release pull requests.

To get automatic version bumps and GitHub releases, commit to `main` using [Conventional Commits](https://www.conventionalcommits.org/) (for example `feat:`, `fix:`, `chore:`). Human-curated highlights for the app also appear on the in-app Releases page.
