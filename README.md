# MyWallet App

<img src="public/image.png" alt="MyWallet Logo" width="120" />

A comprehensive, secure, and user-friendly personal finance management application built with modern web technologies. Take control of your financial future with intuitive budgeting, goal tracking, and insightful analytics.

## ✨ What's New

### Version 2.0.1 (April 18, 2026)
- **Bug Fix**: Improved decimal number formatting and precision for better financial calculations

### Version 2.0.0 (April 17, 2026) - Major Update
- **NEPSE Integration**: Real-time Nepali stock market data, IPO tracking, and MeroShare automation
- **Portfolio Management**: Comprehensive stock and crypto portfolio with market snapshots and notifications
- **SIP Plans**: Systematic Investment Plan automation with transaction enrollment
- **Dropbox Backup**: Secure cloud backup with selective data import/export
- **Biometric Authentication**: Enhanced security with fingerprint and face recognition
- **Timed Wallet Mode**: Track expenses in terms of work hours with time-equivalent calculations
- **Fast Debt**: New debt account type for interest-free loans
- **Bill Reminders**: Never miss payment deadlines with automated reminders
- **Enhanced UI**: Improved mobile responsiveness, theme customization, and accessibility
- **PWA Improvements**: Better offline support and automatic update notifications

## ✨ Features

### 💰 Core Financial Management
- **Transaction Tracking**: Record and categorize all your income and expenses
- **Budget Management**: Set spending limits with subcategories and monitor your progress
- **Goal Setting**: Save for your dreams with visual progress tracking and auto-contribution
- **Goal Challenges**: Gamified savings with penalty tracking and investment rewards
- **Category Organization**: Custom categories for better expense analysis
- **Debt & Credit Management**: Track loans, credit cards, and repayment plans
- **Fast Debt**: Interest-free debt accounts for quick borrowing
- **Timed Wallet Mode**: Track expenses in terms of work hours with time-equivalent calculations

### 📊 Insights & Analytics
- **Financial Health Score**: Get a comprehensive view of your financial wellness
- **Spending Trends**: Visualize your spending patterns over time
- **Category Performance**: Analyze which categories are consuming your budget
- **Scenario Planning**: Calculate how long it takes to reach your financial goals
- **Achievements System**: Unlock achievements for financial milestones

### 🔒 Security & Privacy
- **PIN Lock**: Secure your app with a customizable PIN
- **Biometric Authentication**: Use fingerprint or face recognition (where supported)
- **Data Encryption**: All sensitive data is encrypted locally
- **Privacy Mode**: Hide sensitive information when needed
- **Data Backup & Export**: Securely backup and export your financial data
- **Dropbox Integration**: Cloud backup with selective import and tombstone sync
- **Session Management**: Automatic timeout and cleanup with security logging
- **Developer Menu**: Debug tools for development and troubleshooting

### 🎨 User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Themes**: Choose your preferred visual theme
- **Accessibility**: Built with accessibility best practices
- **Offline Mode**: Continue using the app even without internet
- **PWA Support**: Install as a native app on your device

### 🚀 Additional Features
- **Quick Actions**: Fast access to frequently used functions via floating action button
- **Bill Reminders**: Never miss a payment deadline with automated notifications
- **Receipt Scanner**: OCR-powered receipt scanning with Tesseract.js
- **QR Code Scanner**: Scan QR codes for quick data entry
- **Currency Converter**: Real-time currency conversion with multiple providers
- **Social Sharing**: Share your financial achievements and insights
- **Motivational Quotes**: Stay motivated on your financial journey
- **Multi-currency Support**: Handle different currencies with custom currency options
- **Data Migration**: Easily migrate data between devices
- **Productivity Tools**: Built-in calculator and other productivity features
- **Gaming Features**: Gamification elements for engagement

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.2.3 with App Router
- **UI Library**: React 18.2.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4.1.9
- **Components**: Radix UI (comprehensive component library)
- **Icons**: Lucide React
- **Fonts**: Geist
- **Theme**: next-themes for dark/light mode

### Data & State
- **State Management**: React Context with custom hooks
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Storage**: Local Storage with encryption (SecureWallet)
- **Caching**: Redis (Upstash) for push notifications

### Features & Integrations
- **Charts**: Recharts 2.15.4
- **Date Handling**: date-fns 4.1.0, nepali-date-converter 3.4.0
- **OCR**: Tesseract.js 6.0.1 for receipt scanning
- **QR Codes**: jsqr, qrcode, react-qr-code
- **PDF**: pdfjs-dist, @react-pdf-viewer
- **Automation**: Puppeteer Core for MeroShare automation

### PWA & Performance
- **Service Worker**: Serwist 9.5.7 (next-generation service worker)
- **Build**: Webpack (forced for Serwist compatibility)
- **Analytics**: Vercel Analytics

### Testing & Quality
- **Testing**: Vitest 3.2.4 with React Testing Library
- **Linting**: ESLint 9.39.4 with React and React Hooks plugins
- **Formatting**: Prettier 3.6.2
- **Type Checking**: TypeScript strict mode

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (LTS) and npm/pnpm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mywallet-app.git
   cd mywallet-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

### Web Push + Upstash (Production)

Set these environment variables in Vercel Project Settings for `Production`:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (example: `mailto:alerts@yourdomain.com`)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value as `VAPID_PUBLIC_KEY`)
- `PUSH_HEALTH_SECRET` (recommended; protects `/api/push/health` diagnostics endpoint)

Generate VAPID keys locally:

```bash
pnpm vapid
```

Check production push health:

```bash
curl -H "Authorization: Bearer $PUSH_HEALTH_SECRET" https://your-app.vercel.app/api/push/health
```

## 📱 Usage

1. **First Time Setup**: Complete the onboarding process to set up your profile
2. **Set Security**: Configure PIN lock and biometric authentication
3. **Add Transactions**: Start recording your income and expenses
4. **Create Budgets**: Set spending limits for different categories
5. **Set Goals**: Define your financial objectives
6. **Monitor Insights**: Review your financial health and trends

## 📂 Project Structure

```
mywallet-app/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── cron/                 # Scheduled jobs
│   │   ├── crypto/               # Cryptocurrency APIs
│   │   ├── currency/             # Currency conversion
│   │   ├── dropbox/              # Dropbox OAuth
│   │   ├── meroshare/            # MeroShare automation
│   │   ├── nepse/                # NEPSE stock market data
│   │   ├── proxy/                # Proxy routes
│   │   └── push/                 # Web push notifications
│   ├── dropbox-callback/         # Dropbox OAuth callback
│   ├── onboarding/               # User onboarding flow
│   ├── releases/                 # Release notes page
│   ├── settings/                 # Settings pages
│   ├── welcome/                  # Welcome page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
├── components/                   # React components
│   ├── achievements/             # Achievement system
│   ├── budgets/                  # Budget management
│   ├── categories/               # Category management
│   ├── dashboard/                # Dashboard components
│   ├── debt-credit/              # Debt & credit tracking
│   ├── dropbox/                  # Dropbox integration
│   ├── goals/                    # Goal tracking
│   ├── insights/                 # Analytics components
│   ├── onboarding/               # Onboarding components
│   ├── portfolio/                # Investment portfolio
│   ├── productivity/             # Productivity tools
│   ├── pwa/                      # PWA components
│   ├── security/                 # Security features
│   ├── settings/                 # Settings components
│   ├── social/                   # Social sharing
│   ├── tools/                    # Utility tools
│   ├── transactions/             # Transaction management
│   ├── ui/                       # Reusable UI components (Radix UI)
│   └── welcome/                  # Welcome components
├── contexts/                     # React contexts
│   └── wallet-data-context.tsx   # Global wallet data context
├── hooks/                        # Custom React hooks
│   ├── nepse/                    # NEPSE data hooks
│   ├── use-accessibility.ts     # Accessibility features
│   ├── use-achievements.tsx     # Achievement system
│   ├── use-authentication.ts    # Authentication logic
│   ├── use-color-theme.ts       # Theme management
│   ├── use-mobile.ts            # Mobile detection
│   ├── use-offline-mode.ts      # Offline mode handling
│   ├── use-privacy-mode.tsx     # Privacy mode
│   ├── use-service-worker.ts    # Service worker management
│   ├── use-toast.ts             # Toast notifications
│   └── use-wallet-data.ts       # Main wallet data hook
├── lib/                          # Utility functions
│   ├── push/                     # Push notification utilities
│   ├── api-error.ts              # API error handling
│   ├── backup.ts                 # Backup management
│   ├── biometric-key.ts          # Biometric authentication
│   ├── categories.ts             # Category utilities
│   ├── currency.ts               # Currency conversion
│   ├── data-integrity.ts         # Data validation
│   ├── dropbox.ts                # Dropbox integration
│   ├── goal-calculations.ts      # Goal calculations
│   ├── goal-challenge.ts         # Goal challenge logic
│   ├── key-manager.ts            # Secure key management
│   ├── migration.ts              # Data migration
│   ├── nepali-date-utils.ts      # Nepali date utilities
│   ├── notifications.ts          # Notification management
│   ├── portfolio-colors.ts       # Portfolio color mapping
│   ├── secure-pin-manager.ts     # PIN management
│   ├── security.ts               # Security utilities
│   ├── session-manager.ts       # Session management
│   ├── shift-tracker-storage.ts  # Work shift tracking
│   ├── sip.ts                    # SIP plan management
│   ├── sound-utils.ts            # Sound effects
│   ├── stock-symbol.ts           # Stock symbol utilities
│   ├── storage.ts                # Local storage utilities
│   ├── wallet-ops.ts             # Wallet operations
│   └── wallet-utils.ts           # Wallet utilities
├── scripts/                      # Build and utility scripts
│   ├── generate-vapid-keys.cjs  # VAPID key generation
│   └── sync-manifest-version.mjs # Manifest version sync
├── types/                        # TypeScript type definitions
│   ├── nepali-date.d.ts          # Nepali date types
│   ├── wallet.ts                 # Main wallet types
│   └── web-push.d.ts             # Web push types
├── worker/                       # Service worker
│   └── sw.ts                     # Service worker implementation
├── public/                       # Static assets
├── .eslintrc.json                # ESLint configuration
├── eslint.config.mjs             # ESLint flat config
├── next.config.mjs               # Next.js configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── vitest.config.ts              # Vitest configuration
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Radix UI](https://www.radix-ui.com/) for the amazing component library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Next.js](https://nextjs.org/) for the React framework
- [Lucide React](https://lucide.dev/) for the beautiful icon
- [Coinlore API](https://www.coinlore.com/cryptocurrency-data-api) for free cryptocurrency market data
- [Frankfurter API](https://frankfurter.dev/) for currency conversion rates
- [Open Exchange Rates API (open.er-api.com)](https://www.exchangerate-api.com/docs/free) as currency conversion fallback
- [yonepsescaper](https://shubhamnpk.github.io/yonepse/) for public market datasets used in the app
- [Bhagwoti/woma](https://github.com/Bhagwoti/woma) for the shift tracker idea and UI inspiration
## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the documentation
- Contact the maintainers

---

**Made with ❤️ by mywllet & yoguru team for better financial management**
