# MyWallet App

![MyWallet Logo](public/image.png)

A comprehensive, secure, and user-friendly personal finance management application built with modern web technologies. Take control of your financial future with intuitive budgeting, goal tracking, and insightful analytics.

## 🌟 Features

### 💰 Core Financial Management
- **Transaction Tracking**: Record and categorize all your income and expenses
- **Budget Management**: Set spending limits and monitor your progress
- **Goal Setting**: Save for your dreams with visual progress tracking
- **Category Organization**: Custom categories for better expense analysis
- **Debt & Credit Management**: Track loans, credit cards, and repayment plans

### 📊 Insights & Analytics
- **Financial Health Score**: Get a comprehensive view of your financial wellness
- **Spending Trends**: Visualize your spending patterns over time
- **Category Performance**: Analyze which categories are consuming your budget
- **Scenario Planning**: Calculate how long it takes to reach your financial goals

### 🔒 Security & Privacy
- **PIN Lock**: Secure your app with a customizable PIN
- **Biometric Authentication**: Use fingerprint or face recognition (where supported)
- **Data Encryption**: All sensitive data is encrypted locally
- **Privacy Mode**: Hide sensitive information when needed
- **Data Backup & Export**: Securely backup and export your financial data

### 🎨 User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Themes**: Choose your preferred visual theme
- **Accessibility**: Built with accessibility best practices
- **Offline Mode**: Continue using the app even without internet
- **PWA Support**: Install as a native app on your device

### 🚀 Additional Features
- **Quick Actions**: Fast access to frequently used functions
- **Bill Reminders**: Never miss a payment deadline
- **Motivational Quotes**: Stay motivated on your financial journey
- **Multi-currency Support**: Handle different currencies
- **Data Migration**: Easily migrate data between devices

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context
- **Storage**: Local Storage with encryption
- **PWA**: Service Worker, Web App Manifest
- **Build Tools**: PostCSS, Autoprefixer

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/pnpm
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
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── settings/          # Settings page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── dashboard/        # Dashboard components
│   ├── transactions/     # Transaction management
│   ├── budgets/          # Budget components
│   ├── goals/            # Goal tracking
│   ├── insights/         # Analytics components
│   └── security/         # Security features
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
├── public/               # Static assets
└── styles/               # Additional styles
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
- [Lucide React](https://lucide.dev/) for the beautiful icons

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the documentation
- Contact the maintainers

---

**Made with ❤️ for better financial management**