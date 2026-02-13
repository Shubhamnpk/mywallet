'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Wallet, TrendingUp, Target, Shield, Smartphone, Brain, Check, Sparkles, Clock, DollarSign, Monitor, Tablet, Download } from 'lucide-react';
import OnboardingFlow from '@/components/onboarding/onboarding-flow';
import { useWalletData } from '@/contexts/wallet-data-context';

export default function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, handleOnboardingComplete, setShowOnboarding } = useWalletData();
  const isStartMode = searchParams.get('start') === '1';
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    if (isStartMode) {
      setShowOnboarding(true);
    }
  }, [isStartMode, setShowOnboarding]);

  // SEO metadata for welcome page
  const pageMetadata = {
    title: "MyWallet - Free Personal Finance App | Track Expenses & Budget Money",
    description: "Discover MyWallet, the innovative personal finance app that shows expenses in terms of time worked. Free budget tracker with offline functionality, goal setting, and smart financial insights.",
    keywords: "personal finance app, free budget tracker, expense tracker, money management, financial goals, time-based budgeting, offline finance app, PWA, financial planning",
    openGraph: {
      title: "MyWallet - Free Personal Finance App | Track Expenses & Budget Money",
      description: "Take control of your finances with MyWallet - the innovative personal finance app that shows expenses in terms of time worked. Free forever, works offline.",
      url: "https://mywalletnp.vercel.app/welcome",
      type: "website",
      images: [
        {
          url: "/mywallet.png",
          width: 1200,
          height: 630,
          alt: "MyWallet - Free Personal Finance App Interface",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "MyWallet - Free Personal Finance App | Track Expenses & Budget Money",
      description: "Take control of your finances with MyWallet - the innovative personal finance app that shows expenses in terms of time worked.",
      images: ["/mywallet.png"],
    },
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Wallet,
      title: "Track Expenses",
      description: "Effortlessly log and categorize your daily expenses with our intuitive interface. Get real-time insights into your spending patterns."
    },
    {
      icon: TrendingUp,
      title: "Manage Budgets",
      description: "Set and monitor budgets for different categories. Stay on track with visual progress indicators and smart alerts."
    },
    {
      icon: Target,
      title: "Achieve Goals",
      description: "Set financial goals and track your progress. From saving for a vacation to paying off debt, we've got you covered."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your financial data is protected with advanced security features including biometric authentication and encrypted storage."
    },
    {
      icon: Smartphone,
      title: "Offline Ready",
      description: "Access your financial data anytime, anywhere. Our PWA works seamlessly even without an internet connection."
    },
    {
      icon: Brain,
      title: "Smart Insights",
      description: "Get personalized financial insights and recommendations to optimize your money management strategies."
    }
  ];

  const benefits = [
    "No hidden fees or subscriptions",
    "Bank-level encryption",
    "Cross-platform sync",
    "Export data anytime",
    "24/7 customer support"
  ];

  if (isStartMode && !userProfile) {
    return (
      <OnboardingFlow
        onComplete={(profile) => {
          handleOnboardingComplete(profile);
          router.replace('/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div
          className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl"
          style={{ transform: `translate(-50%, -50%) scale(${1 + scrollY * 0.0005})` }}
        />
      </div>

      <main className="relative z-10">
        {/* Navigation */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4">
            <div className="h-16 flex items-center justify-between">
              <Link href="/welcome" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">MyWallet</span>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-sm">
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
                <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
                <Link href="/releases" className="text-muted-foreground hover:text-foreground transition-colors">Releases</Link>
              </nav>

              <Link
                href="/welcome?start=1"
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-12 pb-32">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-8 animate-fade-in">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Trusted by 100,000+ users worldwide</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-7xl lg:text-6xl font-bold mb-8 leading-tight">
                  <span className="bg-gradient-to-r from-foreground via-foreground to-foreground bg-clip-text text-transparent animate-gradient">
                    Your Money,
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Simplified mywallet 
                  </span>
                </h1>

                {/* Subheading */}
                <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                  Take control of your financial future with the most elegant and powerful personal finance app.
                  <span className="text-foreground font-medium"> Track, budget, and grow</span> with confidence.
                </p>

                {/* Time-Based Feature Highlight */}
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm border border-primary/20 rounded-full px-6 py-3 mb-12">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-medium">See expenses in terms of time worked</span>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-start items-center mb-16">
                  <Link href="/welcome?start=1" className="group relative px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2">
                    Get Started Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <button className="px-8 py-4 bg-secondary text-secondary-foreground border border-border rounded-lg font-semibold text-lg hover:bg-muted transition-all duration-300">
                    Watch Demo
                  </button>
                </div>

                {/* Social Proof */}
                <div className="flex flex-wrap justify-start gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background" />
                      ))}
                    </div>
                    <span>10k+ active users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex text-primary">â˜…â˜…â˜…â˜…â˜…</div>
                    <span>4.9/5 rating</span>
                  </div>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative">
                <div className="relative w-full max-w-lg mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl transform rotate-6" />
                  <div className="relative bg-card/50 backdrop-blur-sm rounded-3xl p-8 border border-border shadow-2xl">
                    <Image
                      src="/mywallet.png"
                      alt="MyWallet - Smart Financial Tracking App Interface showing expense tracking and budget management features - free personal finance app with time-based insights"
                      width={400}
                      height={600}
                      className="w-full h-auto rounded-2xl shadow-lg"
                      priority
                      loading="eager"
                    />
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
                      <Smartphone className="w-10 h-10 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Everything you need to
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> master your money</span>
              </h2>
              <p className="text-xl text-muted-foreground">Powerful features designed for modern financial management</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = activeFeature === index;

                return (
                  <div
                    key={index}
                    className={`group relative bg-card backdrop-blur-sm rounded-xl p-8 border transition-all duration-500 cursor-pointer ${
                      isActive
                        ? 'border-primary/50 shadow-lg scale-105'
                        : 'border-border hover:border-primary/30 hover:shadow-md'
                    }`}
                    onMouseEnter={() => setActiveFeature(index)}
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    </div>

                    <h3 className="text-2xl font-bold mb-3 text-card-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        {/* Time-Based Wallet Feature Highlight */}
        <section id="how-it-works" className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Clock className="w-4 h-4" />
                  Unique Feature
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  See Your Money in
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Terms of Time</span>
                </h2>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Unlike traditional finance apps, MyWallet shows you exactly how much time you need to work to afford your expenses and purchases.
                  Make smarter financial decisions with time-based insights.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-card-foreground">Time-Aware Transactions</h3>
                      <p className="text-muted-foreground">Every expense shows you the hours of work required to earn that money back.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-card-foreground">Income vs Expense Balance</h3>
                      <p className="text-muted-foreground">Visualize how your spending aligns with your earning capacity in real-time.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-card-foreground">Work-Life Balance</h3>
                      <p className="text-muted-foreground">Understand the true cost of your purchases in terms of your most valuable asset - time.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-2xl" />
                <div className="relative bg-card/50 backdrop-blur-sm rounded-3xl p-8 border border-border shadow-2xl">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                      <div>
                        <div className="text-sm text-muted-foreground">Coffee Purchase</div>
                        <div className="text-2xl font-bold text-card-foreground">$5.00</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Time Cost</div>
                        <div className="text-lg font-semibold text-primary">12 min</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                      <div>
                        <div className="text-sm text-muted-foreground">Lunch Out</div>
                        <div className="text-2xl font-bold text-card-foreground">$25.00</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Time Cost</div>
                        <div className="text-lg font-semibold text-primary">1h 15min</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                      <div>
                        <div className="text-sm text-muted-foreground">New Headphones</div>
                        <div className="text-2xl font-bold text-card-foreground">$150.00</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Time Cost</div>
                        <div className="text-lg font-semibold text-primary">7h 30min</div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Your Hourly Rate</div>
                          <div className="text-xl font-bold text-primary">$25/hr</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Monthly Income</div>
                          <div className="text-xl font-bold text-primary">$4,000</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PWA Cross-Device Section */}
        <section id="faq" className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Works on <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Every Device</span>
              </h2>
              <p className="text-xl text-muted-foreground">Access MyWallet anywhere, anytime with our Progressive Web App technology</p>
            </div>

            <div className="bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-xl">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Download className="w-4 h-4" />
                    Install Anywhere
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-card-foreground">One App, Every Device</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Thanks to our Progressive Web App technology, MyWallet works seamlessly across all your devices.
                    Install it once and access your finances everywhere - no app store downloads required.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-card-foreground">Install from any browser</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-card-foreground">Works offline</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-card-foreground">Auto-sync across devices</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-card-foreground">Native app performance</span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border text-center">
                      <Monitor className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-sm font-medium text-card-foreground">Chrome</div>
                      <div className="text-xs text-muted-foreground">Desktop</div>
                    </div>
                    <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border text-center">
                      <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-sm font-medium text-card-foreground">Safari</div>
                      <div className="text-xs text-muted-foreground">iOS</div>
                    </div>
                    <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border text-center">
                      <Tablet className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-sm font-medium text-card-foreground">Firefox</div>
                      <div className="text-xs text-muted-foreground">Android</div>
                    </div>
                    <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border text-center">
                      <Download className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-sm font-medium text-card-foreground">Edge</div>
                      <div className="text-xs text-muted-foreground">Windows</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Benefits Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto bg-card backdrop-blur-xl rounded-2xl p-12 border border-border shadow-xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">
                  Why choose
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> MyWallet</span>?
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Join thousands who have transformed their financial lives with our comprehensive platform.
                </p>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3 group">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span className="text-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl blur-2xl" />
                <div className="relative bg-muted/50 backdrop-blur-sm rounded-xl p-8 border border-border">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Savings</span>
                      <span className="text-2xl font-bold text-primary">+$12,450</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card rounded-lg p-4 border border-border">
                        <div className="text-sm text-muted-foreground mb-1">This Month</div>
                        <div className="text-xl font-bold">$2,340</div>
                      </div>
                      <div className="bg-card rounded-lg p-4 border border-border">
                        <div className="text-sm text-muted-foreground mb-1">Goal Progress</div>
                        <div className="text-xl font-bold">76%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Loved by <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">thousands</span> of users
              </h2>
              <p className="text-xl text-muted-foreground">See what our community has to say about their financial transformation</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card backdrop-blur-sm rounded-xl p-8 border border-border shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="flex text-primary text-lg">â˜…â˜…â˜…â˜…â˜…</div>
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "MyWallet completely changed how I manage my money. I've saved over $2,000 in the last 6 months thanks to the smart budgeting features."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                    S
                  </div>
                  <div>
                    <div className="font-semibold text-card-foreground">Sarah Johnson</div>
                    <div className="text-sm text-muted-foreground">Small Business Owner</div>
                  </div>
                </div>
              </div>

              <div className="bg-card backdrop-blur-sm rounded-xl p-8 border border-border shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="flex text-primary text-lg">â˜…â˜…â˜…â˜…â˜…</div>
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "The offline functionality is a game-changer. I can track expenses anywhere, even without internet. Perfect for travel!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                    M
                  </div>
                  <div>
                    <div className="font-semibold text-card-foreground">Mike Chen</div>
                    <div className="text-sm text-muted-foreground">Digital Nomad</div>
                  </div>
                </div>
              </div>

              <div className="bg-card backdrop-blur-sm rounded-xl p-8 border border-border shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="flex text-primary text-lg">â˜…â˜…â˜…â˜…â˜…</div>
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "Finally achieved my dream vacation goal! The goal tracking and progress visualization kept me motivated every step of the way."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                    A
                  </div>
                  <div>
                    <div className="font-semibold text-card-foreground">Anna Rodriguez</div>
                    <div className="text-sm text-muted-foreground">Teacher</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                How <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">MyWallet</span> works
              </h2>
              <p className="text-xl text-muted-foreground">Get started in minutes with our simple 3-step process</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-primary-foreground">1</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-card-foreground">Sign Up</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Create your free account in under 2 minutes. No credit card required, no hidden fees.
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-primary-foreground">2</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-card-foreground">Set Up</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Connect your accounts and customize your financial goals. Our AI helps you get started quickly.
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-primary-foreground">3</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-card-foreground">Grow</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Watch your wealth grow with smart insights, automated savings, and personalized recommendations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-xl rounded-2xl p-12 border border-border shadow-xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">100K+</div>
                  <div className="text-muted-foreground">Active Users</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">$2.5M+</div>
                  <div className="text-muted-foreground">Money Saved</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">4.9â˜…</div>
                  <div className="text-muted-foreground">App Rating</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">50+</div>
                  <div className="text-muted-foreground">Countries</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Frequently Asked <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Questions</span>
              </h2>
              <p className="text-xl text-muted-foreground">Everything you need to know about MyWallet</p>
            </div>

            <div className="space-y-6">
              <div className="bg-card backdrop-blur-sm rounded-xl p-8 border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">Is MyWallet really free?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Yes! MyWallet is completely free to use. We believe everyone should have access to powerful financial tools without hidden costs or subscriptions.
                </p>
              </div>

              <div className="bg-card backdrop-blur-sm rounded-xl p-8 border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">How secure is my financial data?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your data is protected with bank-level encryption, biometric authentication, and secure cloud storage. We never sell your personal information.
                </p>
              </div>

              <div className="bg-card backdrop-blur-sm rounded-xl p-8 border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">Can I use MyWallet offline?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Absolutely! MyWallet is a Progressive Web App (PWA) that works seamlessly offline. Track expenses, view budgets, and access your data anywhere.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-xl rounded-2xl p-12 border border-border overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <div className="relative">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Ready to Take Control of Your Finances?
                </h2>
                <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                  Join over 100,000 users who have transformed their financial lives with MyWallet. Start your journey today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/welcome?start=1" className="px-10 py-5 bg-primary text-primary-foreground rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-center">
                    Try Web Version
                  </Link>
                  <button className="px-10 py-5 bg-secondary text-secondary-foreground border border-border rounded-lg font-semibold text-lg hover:bg-muted transition-all duration-300">
                    Download Mobile App
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-6">
                  No credit card required â€¢ Free forever â€¢ Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-14">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <span className="text-2xl font-bold">MyWallet</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Time-aware personal finance app to track spending, manage budgets, and stay in control across devices.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3">Product</h3>
              <div className="space-y-2 text-sm">
                <a href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#how-it-works" className="block text-muted-foreground hover:text-foreground transition-colors">How it works</a>
                <Link href="/releases" className="block text-muted-foreground hover:text-foreground transition-colors">Release notes</Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3">Start</h3>
              <div className="space-y-2 text-sm">
                <Link href="/welcome?start=1" className="block text-muted-foreground hover:text-foreground transition-colors">Start onboarding</Link>
                <Link href="/settings?tab=about" className="block text-muted-foreground hover:text-foreground transition-colors">About</Link>
                <Link href="/" className="block text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border/60 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Made in Nepal.</p>
            <p className="text-sm text-muted-foreground">© 2026 MyWallet. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

