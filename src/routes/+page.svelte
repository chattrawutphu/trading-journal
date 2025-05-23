<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import CosmicNebula from '$lib/components/effect/CosmicNebula.svelte';
  import AnimatedBackground from '$lib/components/effect/AnimatedBackground.svelte';
  import FloatingElements from '$lib/components/effect/FloatingElements.svelte';
  
  // State variables
  let showDemo = false;
  let activeExchange = 0;
  let activeFeature = 0;
  
  // Scroll animation
  let sections = [];
  let animatedElements = [];
  let observer;
  
  // Performance optimizations
  let showBackgroundEffects = true;
  let userPrefersReducedMotion = false;
  let hasScrolled = false;
  let visibleSections = new Set();
  
  // Define trading icons
  const icons = [
    {
      name: 'chart-line',
      path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      color: 'rgba(59, 130, 246, 0.2)' // blue
    },
    {
      name: 'chart-bar',
      path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'rgba(139, 92, 246, 0.2)' // purple
    },
    {
      name: 'trending-up',
      path: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      color: 'rgba(16, 185, 129, 0.2)' // green
    },
    {
      name: 'candlestick',
      path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'rgba(239, 68, 68, 0.2)' // red
    },
    {
      name: 'dollar-sign',
      path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'rgba(245, 158, 11, 0.2)' // yellow
    }
  ];
  
  // Exchange data
  const exchanges = [
    { name: "Binance Futures", logo: "/placeholder.svg?height=40&width=120" },
    { name: "OKX Futures", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Bybit Futures", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Kucoin Futures", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Gate.io Futures", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Manual Trading", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Top 3 Forex Brokers", logo: "/placeholder.svg?height=40&width=120" },
  ];

  // Features data
  const features = [
    {
      title: "AI-Powered Analysis",
      description:
        "Our advanced AI analyzes your trading patterns and market conditions to provide personalized insights and strategy recommendations.",
      icon: "LineChart",
      color: "from-blue-500 to-indigo-600",
    },
    {
      title: "Automated Trading Bots",
      description:
        "Create custom trading bots with easy-to-use rule builders. No coding required - our AI helps design effective bots tailored to your strategy.",
      icon: "Bot",
      color: "from-purple-500 to-pink-600",
    },
    {
      title: "Exchange Connectivity",
      description:
        "Seamlessly connect to major futures exchanges and forex brokers. Track all your trades in one place with real-time synchronization.",
      icon: "Wallet",
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Rule-Based Trading",
      description:
        "Create personalized trading rules and receive alerts when you're about to break them. Stay disciplined and improve your performance.",
      icon: "Shield",
      color: "from-amber-500 to-orange-600",
    },
    {
      title: "Copy Trading",
      description:
        "Follow successful traders and automatically copy their strategies. Or share your own strategies to earn additional income.",
      icon: "Copy",
      color: "from-red-500 to-rose-600",
    },
    {
      title: "Customizable Dashboard",
      description:
        "Build your perfect workspace with our drag-and-drop widget system. Create a personalized trading environment that works for you.",
      icon: "LayoutGrid",
      color: "from-cyan-500 to-blue-600",
    },
  ];
  
  // Traders data for copy trading section
  const traders = [
    {
      name: "Alex Trader",
      avatar: "/placeholder.svg?height=50&width=50",
      winRate: "72%",
      monthlyReturn: "+18.5%",
      followers: "2.4K",
      strategy: "Swing Trading",
      verified: true,
    },
    {
      name: "Sarah Crypto",
      avatar: "/placeholder.svg?height=50&width=50",
      winRate: "68%",
      monthlyReturn: "+22.3%",
      followers: "1.8K",
      strategy: "Breakout Trading",
      verified: true,
    },
    {
      name: "Mike Futures",
      avatar: "/placeholder.svg?height=50&width=50",
      winRate: "65%",
      monthlyReturn: "+15.7%",
      followers: "3.2K",
      strategy: "Trend Following",
      verified: true,
    },
  ];
  
  // Pricing plans
  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for beginners",
      features: [
        "Manual trade tracking",
        "Basic analytics",
        "Single exchange connection",
        "Community access",
        "5 trading rules",
      ],
      color: "from-gray-500 to-gray-700",
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For serious traders",
      features: [
        "Everything in Free",
        "AI-powered analysis",
        "Multiple exchange connections",
        "1 trading bot",
        "Unlimited trading rules",
        "Copy trading (follower)",
      ],
      color: "from-blue-500 to-purple-600",
      popular: true,
    },
    {
      name: "Ultimate",
      price: "$79",
      period: "/month",
      description: "For professional traders",
      features: [
        "Everything in Pro",
        "Unlimited trading bots",
        "Advanced AI strategy builder",
        "Copy trading (publisher)",
        "Priority support",
        "API access",
      ],
      color: "from-purple-500 to-pink-600",
    },
  ];
  
  // Testimonials
  const testimonials = [
    {
      name: "John Smith",
      role: "Professional Futures Trader",
      avatar: "/placeholder.svg?height=60&width=60",
      quote: "This platform has completely transformed my trading. The AI insights helped me identify patterns I was missing, and my win rate has improved by 15% in just two months.",
    },
    {
      name: "Lisa Chen",
      role: "Crypto Day Trader",
      avatar: "/placeholder.svg?height=60&width=60",
      quote: "The automated bots have saved me countless hours. I can now focus on strategy while the platform handles execution. My returns have never been better.",
    },
    {
      name: "Michael Rodriguez",
      role: "Forex Trader",
      avatar: "/placeholder.svg?height=60&width=60",
      quote: "The trading rules feature has been a game-changer for my discipline. I no longer make emotional decisions, and my performance has become much more consistent.",
    }
  ];
  
  // Stats
  const stats = [
    { value: "25,000+", label: "Active Traders" },
    { value: "$1.2B+", label: "Monthly Volume" },
    { value: "98%", label: "Customer Satisfaction" },
    { value: "15+", label: "Supported Exchanges" }
  ];
  
  // Initialize animations on mount with performance improvements
  onMount(() => {
    if (!browser) return;
    
    // Check for reduced motion preference
    userPrefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (userPrefersReducedMotion) {
      showBackgroundEffects = false;
    }
    
    // Initialize scroll animations with improved performance
    initScrollAnimations();
    
    // Rotate active exchange and feature with less frequency
    const interval = setInterval(() => {
      // Only update if user has scrolled (indicates engagement)
      if (hasScrolled) {
        activeExchange = (activeExchange + 1) % exchanges.length;
        activeFeature = (activeFeature + 1) % features.length;
      }
    }, 5000); // Increased from 3000 to 5000ms
    
    // Track scroll for performance optimization
    const handleScroll = () => {
      hasScrolled = true;
      // Remove listener after first scroll
      window.removeEventListener('scroll', handleScroll);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', handleScroll);
      
      // Clean up scroll observer
      if (observer) {
        observer.disconnect();
      }
    };
  });
  
  // Initialize scroll animations with performance improvements
  function initScrollAnimations() {
    if (!browser) return;
    
    // Get all sections and animated elements
    sections = document.querySelectorAll('.animate-section');
    animatedElements = document.querySelectorAll('.animate-element');
    
    // Create intersection observer for sections with options for better performance
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-visible');
          // Track visible sections to optimize rendering
          if (entry.target.classList.contains('animate-section')) {
            visibleSections.add(entry.target.id || Math.random().toString(36).substring(2, 9));
          }
        } else {
          // Optional: remove animations when no longer visible to save resources
          if (entry.target.classList.contains('animate-section')) {
            visibleSections.delete(entry.target.id || Math.random().toString(36).substring(2, 9));
          }
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '100px' // Preload a bit before elements come into view
    });
    
    // Observe all sections and animated elements
    sections.forEach(section => observer.observe(section));
    animatedElements.forEach(element => observer.observe(element));
  }
  
  // Toggle demo modal
  function toggleDemo() {
    showDemo = !showDemo;
  }
  
  // Toggle background effects for performance
  function toggleBackgroundEffects() {
    showBackgroundEffects = !showBackgroundEffects;
  }
</script>

<div class="min-h-screen bg-black text-white relative overflow-hidden">
  <!-- Conditionally render heavy background effects -->
  {#if showBackgroundEffects && browser}
    <!-- Cosmic Nebula Background with lazy initialization -->
    <div class="absolute inset-0 z-10 w-full h-full overflow-hidden pointer-events-none">
      <CosmicNebula />
    </div>

    <!-- Animated Background with lazy initialization -->
    <AnimatedBackground 
      particleCount={100} 
      connectionDistance={150}
    />
    
    <!-- Floating Elements with lazy initialization -->
    <FloatingElements />
  {/if}

  <!-- Performance toggle for users with slower devices -->
  <button 
    class="fixed bottom-4 right-4 z-50 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm border border-white/10"
    on:click={toggleBackgroundEffects}
  >
    {showBackgroundEffects ? 'Disable effects' : 'Enable effects'}
  </button>

  <!-- Header with simplified background -->
  <header class="absolute top-0 left-0 right-0 z-50 h-16 bg-black/50 backdrop-blur-sm">
    <div class="relative flex items-center justify-between px-6 py-4 z-10">
      <div class="flex items-center gap-2">
        <a href="/" class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <span class="font-medium text-white">TradingJournal</span>
        </a>
      </div>
      <nav class="hidden md:flex items-center gap-8">
        <a href="#features" class="text-sm text-gray-300 hover:text-white transition-colors">Features</a>
        <a href="#testimonials" class="text-sm text-gray-300 hover:text-white transition-colors">Testimonials</a>
        <a href="#stats" class="text-sm text-gray-300 hover:text-white transition-colors">Stats</a>
        <a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">Pricing</a>
        <a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">Contact</a>
      </nav>
      <button 
        class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity" 
        on:click={() => goto('/login')}
      >
        Login
      </button>
    </div>
  </header>
  
  <!-- Hero Section -->
  <section class="relative z-10 py-20 px-6 animate-section  bg-black/50 pt-[8rem]">
    <div class="max-w-7xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="animate-element slide-right">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Elevate Your Trading with
            <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              AI-Powered Insights
            </span>
          </h1>
          <p class="text-gray-300 text-lg mb-8 max-w-lg">
            Track, analyze, and improve your trading performance with our comprehensive journal and AI assistant.
            Designed for futures and forex traders of all levels.
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <button class="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 px-6 py-3 rounded-md font-medium">
              Start Free Trial
            </button>
            <button 
              on:click={toggleDemo}
              class="border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-md flex items-center justify-center"
            >
              <svg class="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Watch Demo
            </button>
          </div>
          <div class="mt-8 flex items-center gap-4">
            <div class="flex -space-x-2">
              {#each Array(5) as _, i}
                <div class="w-8 h-8 rounded-full border-2 border-black bg-gray-300 flex items-center justify-center text-black text-xs">
                  {String.fromCharCode(65 + i)}
                </div>
              {/each}
            </div>
            <div class="text-sm">
              <span class="text-blue-400 font-medium">500+</span> traders joined this week
            </div>
          </div>
        </div>
        <div class="relative animate-element slide-left">
          <div class="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <div class="aspect-video bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-6 backdrop-blur">
              <div class="absolute top-4 left-4 right-4 h-8 bg-gray-800/80 rounded-md flex items-center px-3 gap-2">
                <div class="flex gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
                <div class="text-xs text-gray-400">Trading Dashboard</div>
              </div>
              <div class="mt-12 grid grid-cols-3 gap-4">
                <div class="col-span-2 bg-gray-900/60 rounded-lg p-4 h-40">
                  <h4 class="text-sm font-medium text-gray-400 mb-2">Performance</h4>
                  <div class="h-32 relative">
                    <svg viewBox="0 0 100 50" class="w-full h-full">
                      <path
                        d="M0,35 Q10,30 20,32 T40,25 T60,20 T80,10 T100,15"
                        fill="none"
                        stroke="url(#gradient-hero)"
                        stroke-width="2"
                        class="animate-chart"
                      />
                      <defs>
                        <linearGradient id="gradient-hero" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#3b82f6" />
                          <stop offset="100%" stop-color="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
                <div class="col-span-1 bg-gray-900/60 rounded-lg p-4 h-40 flex flex-col">
                  <h4 class="text-sm font-medium text-gray-400 mb-2">Stats</h4>
                  <div class="space-y-3 flex-1 flex flex-col justify-center">
                    <div class="flex justify-between items-center">
                      <span class="text-xs">Win Rate</span>
                      <span class="text-green-500 font-medium">68%</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-xs">Profit Factor</span>
                      <span class="text-green-500 font-medium">2.4</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-xs">Avg. Trade</span>
                      <span class="text-green-500 font-medium">$127</span>
                    </div>
                  </div>
                </div>
                <div class="col-span-3 bg-gray-900/60 rounded-lg p-4">
                  <h4 class="text-sm font-medium text-gray-400 mb-2">AI Insights</h4>
                  <div class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span class="text-sm">Your best performance is during Asian market hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-2xl opacity-50"></div>
          <div class="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full blur-2xl opacity-50"></div>
        </div>
      </div>
    </div>
  </section>

  <!-- Stats Section -->
  <section class="py-16 px-6 relative z-10 animate-section">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        {#each stats as stat, i}
          <div class="text-center animate-element fade-in" style="animation-delay: {i * 100}ms">
            <div class="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">{stat.value}</div>
            <div class="text-gray-300">{stat.label}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- AI Analysis Section -->
  <section class="py-24 px-6 relative overflow-hidden animate-section">
    <div class="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-purple-900/20 z-0"></div>
    <div class="max-w-7xl mx-auto relative z-10">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="animate-element slide-right">
          <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            AI-Powered Trading Analysis
          </h2>
          <p class="text-gray-300 mb-8 text-lg">
            Our advanced AI analyzes your trading history, market conditions, and behavioral patterns to provide
            personalized insights and strategy recommendations.
          </p>
          <ul class="space-y-4">
            {#each [
              "Identify strengths and weaknesses in your trading approach",
              "Receive AI-generated strategy improvements tailored to your style",
              "Detect emotional trading patterns and cognitive biases",
              "Get real-time market analysis and trading opportunities",
            ] as item, index}
              <li class="flex items-start gap-3 animate-element fade-in" style="animation-delay: {index * 100}ms">
                <svg class="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-element slide-left">
          <div class="aspect-video bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-6 backdrop-blur">
            <div class="absolute top-4 left-4 right-4 h-8 bg-gray-800/80 rounded-md flex items-center px-3 gap-2">
              <div class="flex gap-1.5">
                <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
              <div class="text-xs text-gray-400">AI Analysis Dashboard</div>
            </div>

            <div class="mt-12 grid grid-cols-2 gap-4">
              <div class="bg-gray-900/60 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-400 mb-2">Win Rate Analysis</h4>
                <div class="h-32 flex items-end gap-1">
                  {#each [65, 72, 58, 80, 75, 68, 82] as height, i}
                    <div
                      class="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm animate-element grow-up"
                      style="height: {height}%; animation-delay: {i * 100}ms"
                    ></div>
                  {/each}
                </div>
              </div>

              <div class="bg-gray-900/60 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-400 mb-2">Strategy Performance</h4>
                <div class="h-32 relative">
                  <svg viewBox="0 0 100 100" class="w-full h-full">
                    <path
                      d="M0,50 Q20,20 40,40 T80,30 T100,40"
                      fill="none"
                      stroke="url(#gradient)"
                      stroke-width="2"
                      class="animate-chart"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#3b82f6" />
                        <stop offset="100%" stop-color="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <div class="col-span-2 bg-gray-900/60 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-400 mb-2">AI Recommendations</h4>
                <div class="space-y-2 text-sm">
                  {#each [
                    "Consider tightening stop-loss on BTC positions",
                    "Your best performance is during Asian market hours",
                    "Reduce position size on volatile market days"
                  ] as recommendation, i}
                    <div class="flex items-center gap-2 animate-element fade-in" style="animation-delay: {i * 200}ms">
                      <svg class="h-4 w-4 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                      <span>{recommendation}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Exchange Integration Section -->
  <section id="features" class="py-24 px-6 animate-section">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 animate-element fade-in">
        <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Connect Your Favorite Exchanges
        </h2>
        <p class="text-gray-300 max-w-3xl mx-auto text-lg">
          Seamlessly integrate with major cryptocurrency futures exchanges and forex brokers. Track all your trades in
          one place with real-time synchronization.
        </p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
        {#each exchanges as exchange, index}
          <div
            class="relative rounded-xl overflow-hidden border {index === activeExchange ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/10'} transition-all duration-300 p-4 flex flex-col items-center justify-center animate-element fade-in"
            style="animation-delay: {index * 100}ms"
          >
            <div class="h-10 mb-3 flex items-center justify-center">
              <img src={exchange.logo || "/placeholder.svg"} alt={exchange.name} class="max-h-full" />
            </div>
            <p class="text-sm text-center text-gray-300">{exchange.name}</p>
          </div>
        {/each}
      </div>

      <div class="mt-12 text-center animate-element fade-in">
        <button class="border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-md flex items-center mx-auto">
          View All Integrations 
          <svg class="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
    </div>
  </section>

  <!-- Features Grid Section -->
  <section class="py-24 px-6 bg-gradient-to-b from-transparent to-blue-950/20 animate-section">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 animate-element fade-in">
        <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Powerful Trading Features
        </h2>
        <p class="text-gray-300 max-w-3xl mx-auto text-lg">
          Everything you need to succeed in trading. Our comprehensive tools help you analyze, track, and improve your
          trading performance with professional-grade features.
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each features as feature, index}
          <div class="relative rounded-xl bg-gradient-to-b from-gray-800/10 to-gray-800/30 p-[1px] backdrop-blur-3xl animate-element fade-in" style="animation-delay: {index * 100}ms">
            <div class="relative rounded-xl bg-black p-6 h-full">
              <div class="w-12 h-12 rounded-lg bg-gradient-to-br {feature.color} flex items-center justify-center mb-4">
                <!-- Feature icon based on name -->
                <svg class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  {#if feature.icon === 'LineChart'}
                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                  {:else if feature.icon === 'Bot'}
                    <path d="M12 2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8Z"></path>
                    <path d="M20 2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8Z"></path>
                    <path d="M12 14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h8Z"></path>
                    <path d="M20 14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h8Z"></path>
                  {:else if feature.icon === 'Wallet'}
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
                  {:else if feature.icon === 'Shield'}
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  {:else if feature.icon === 'Copy'}
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  {:else if feature.icon === 'LayoutGrid'}
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  {/if}
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">{feature.title}</h3>
              <p class="text-gray-400">{feature.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Trading Bot Section -->
  <section class="py-24 px-6 relative overflow-hidden animate-section">
    <div class="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-blue-900/20 z-0"></div>
    <div class="max-w-7xl mx-auto relative z-10">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="order-2 md:order-1 relative rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-element slide-right">
          <div class="aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-6 backdrop-blur">
            <div class="absolute top-4 left-4 right-4 h-8 bg-gray-800/80 rounded-md flex items-center px-3 gap-2">
              <div class="flex gap-1.5">
                <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
              <div class="text-xs text-gray-400">Bot Builder</div>
            </div>

            <div class="mt-12 grid grid-cols-3 gap-4">
              <div class="col-span-1 bg-gray-900/60 rounded-lg p-4 h-64 overflow-y-auto">
                <h4 class="text-sm font-medium text-gray-400 mb-3">Trading Rules</h4>
                <div class="space-y-3">
                  {#each [
                    "Entry: RSI < 30",
                    "Exit: Take Profit 3%",
                    "Stop Loss: 1.5%",
                    "Max Position: 5%",
                    "Timeframe: 4H",
                    "Pairs: BTC, ETH",
                  ] as rule, i}
                    <div class="bg-gray-800/60 p-2 rounded text-xs flex justify-between animate-element fade-in" style="animation-delay: {i * 100}ms">
                      <span>{rule}</span>
                      <span class="text-blue-400 cursor-pointer">Edit</span>
                    </div>
                  {/each}
                </div>
              </div>

              <div class="col-span-2 bg-gray-900/60 rounded-lg p-4 h-64">
                <h4 class="text-sm font-medium text-gray-400 mb-3">Performance Simulation</h4>
                <div class="h-40 relative">
                  <svg viewBox="0 0 100 50" class="w-full h-full">
                    <path
                      d="M0,25 Q10,20 20,28 T40,22 T60,30 T80,15 T100,20"
                      fill="none"
                      stroke="url(#gradient2)"
                      stroke-width="2"
                      class="animate-chart"
                    />
                    <defs>
                      <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#8b5cf6" />
                        <stop offset="100%" stop-color="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div class="flex justify-between text-xs text-gray-400">
                  <div>Win Rate: 68%</div>
                  <div>Profit: +42.3%</div>
                  <div>Drawdown: 12.5%</div>
                </div>
              </div>

              <div class="col-span-3 bg-gray-900/60 rounded-lg p-4">
                <div class="flex justify-between items-center">
                  <h4 class="text-sm font-medium text-gray-400">AI Suggestions</h4>
                  <span class="text-xs text-blue-400 cursor-pointer">Apply All</span>
                </div>
                <div class="mt-2 text-xs space-y-2">
                  {#each [
                    "Adding a volume filter could improve entry accuracy",
                    "Consider trailing stop loss for better profit retention"
                  ] as suggestion, i}
                    <div class="flex items-center gap-2 animate-element fade-in" style="animation-delay: {i * 200}ms">
                      <svg class="h-3 w-3 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                      <span>{suggestion}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="order-1 md:order-2 animate-element slide-left">
          <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            AI-Powered Trading Bots
          </h2>
          <p class="text-gray-300 mb-8 text-lg">
            Create custom trading bots with our intuitive rule builder. No coding required - our AI helps design
            effective bots tailored to your strategy.
          </p>
          <ul class="space-y-4">
            {#each [
              "Easy-to-use visual bot builder with drag-and-drop interface",
              "AI-assisted strategy optimization based on historical performance",
              "Backtest your strategies with accurate market simulation",
              "Deploy bots across multiple exchanges with one click",
              "Monitor performance in real-time with detailed analytics",
            ] as item, index}
              <li class="flex items-start gap-3 animate-element fade-in" style="animation-delay: {index * 100}ms">
                <svg class="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
          <div class="mt-8 animate-element fade-in">
            <button class="bg-gradient-to-r from-purple-500 to-blue-600 hover:opacity-90 px-4 py-2 rounded-md flex items-center">
              Create Your First Bot 
              <svg class="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Rule Creation Section -->
  <section class="py-24 px-6 animate-section">
    <div class="max-w-7xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="animate-element slide-right">
          <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
            Trading Rules & Discipline
          </h2>
          <p class="text-gray-300 mb-8 text-lg">
            Create personalized trading rules and receive alerts when you're about to break them. Stay disciplined and
            improve your performance over time.
          </p>
          <ul class="space-y-4">
            {#each [
              "Define custom rules based on your trading strategy",
              "Receive real-time alerts when you're about to break your rules",
              "Track rule adherence and its impact on performance",
              "AI suggestions for rule improvements based on your results",
              "Psychological safeguards to prevent emotional trading",
            ] as item, index}
              <li class="flex items-start gap-3 animate-element fade-in" style="animation-delay: {index * 100}ms">
                <svg class="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-element slide-left">
          <div class="aspect-video bg-gradient-to-br from-green-900/50 to-blue-900/50 p-6 backdrop-blur">
            <div class="absolute top-4 left-4 right-4 h-8 bg-gray-800/80 rounded-md flex items-center px-3 gap-2">
              <div class="flex gap-1.5">
                <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
              <div class="text-xs text-gray-400">Trading Rules Manager</div>
            </div>

            <div class="mt-12 space-y-4">
              <div class="bg-gray-900/60 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-400 mb-3">Your Trading Rules</h4>
                <div class="space-y-3">
                  {#each [
                    "Never risk more than 2% per trade",
                    "No trading during major news events",
                    "Take profits at predetermined levels",
                    "Always use stop losses",
                    "No revenge trading after losses",
                  ] as rule, i}
                    <div class="bg-gray-800/60 p-3 rounded flex justify-between items-center animate-element fade-in" style="animation-delay: {i * 100}ms">
                      <div class="flex items-center gap-2">
                        <svg class="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span>{rule}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button class="text-xs text-blue-400">Edit</button>
                        <button class="text-xs text-red-400">Delete</button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <div class="bg-gray-900/60 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-400 mb-3">Rule Violations</h4>
                <div class="space-y-3">
                  <div class="bg-red-900/30 p-3 rounded flex items-center justify-between animate-element fade-in">
                    <div class="flex items-center gap-2">
                      <svg class="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      <span>Position size exceeded 2% on BTC trade</span>
                    </div>
                    <span class="text-xs text-gray-400">Today, 10:45 AM</span>
                  </div>
                  <div class="bg-yellow-900/30 p-3 rounded flex items-center justify-between animate-element fade-in" style="animation-delay: 100ms">
                    <div class="flex items-center gap-2">
                      <svg class="h-4 w-4 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      <span>Traded during FOMC announcement</span>
                    </div>
                    <span class="text-xs text-gray-400">Yesterday, 2:30 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Testimonials Section -->
  <section id="testimonials" class="py-24 px-6 bg-gradient-to-b from-transparent to-purple-950/20 animate-section">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 animate-element fade-in">
        <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          What Our Traders Say
        </h2>
        <p class="text-gray-300 max-w-3xl mx-auto text-lg">
          Join thousands of successful traders who have transformed their trading with our platform.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        {#each testimonials as testimonial, index}
          <div class="relative rounded-xl bg-gradient-to-b from-gray-800/10 to-gray-800/30 p-[1px] backdrop-blur-3xl animate-element fade-in" style="animation-delay: {index * 200}ms">
            <div class="relative rounded-xl bg-black p-6 h-full">
              <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 rounded-full overflow-hidden">
                  <img src={testimonial.avatar || "/placeholder.svg"} alt={testimonial.name} class="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 class="font-semibold">{testimonial.name}</h3>
                  <p class="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
              <div class="relative">
                <svg class="absolute -top-4 -left-4 h-8 w-8 text-blue-500/20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p class="text-gray-300 italic">{testimonial.quote}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Copy Trading Section -->
  <section class="py-24 px-6 animate-section">
    <div class="max-w-7xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="order-2 md:order-1 animate-element slide-right">
          <div class="space-y-6">
            {#each traders as trader, index}
              <div class="relative rounded-xl bg-gradient-to-b from-gray-800/10 to-gray-800/30 p-[1px] backdrop-blur-3xl animate-element fade-in" style="animation-delay: {index * 200}ms">
                <div class="relative rounded-xl bg-black p-4">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full overflow-hidden">
                      <img
                        src={trader.avatar || "/placeholder.svg"}
                        alt={trader.name}
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="font-semibold">{trader.name}</h3>
                        {#if trader.verified}
                          <span class="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">Verified</span>
                        {/if}
                      </div>
                      <p class="text-sm text-gray-400">{trader.strategy}</p>
                    </div>
                    <div class="ml-auto">
                      <button class="bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 px-3 py-1 text-sm rounded-md">
                        Copy
                      </button>
                    </div>
                  </div>
                  <div class="grid grid-cols-3 gap-4 mt-4">
                    <div class="text-center">
                      <p class="text-xs text-gray-400">Win Rate</p>
                      <p class="font-semibold text-green-500">{trader.winRate}</p>
                    </div>
                    <div class="text-center">
                      <p class="text-xs text-gray-400">Monthly</p>
                      <p class="font-semibold text-green-500">{trader.monthlyReturn}</p>
                    </div>
                    <div class="text-center">
                      <p class="text-xs text-gray-400">Followers</p>
                      <p class="font-semibold">{trader.followers}</p>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
            <div class="text-center animate-element fade-in">
              <button class="border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-md flex items-center mx-auto">
                View All Traders 
                <svg class="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="order-1 md:order-2 animate-element slide-left">
          <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Copy Trading Marketplace
          </h2>
          <p class="text-gray-300 mb-8 text-lg">
            Follow successful traders and automatically copy their strategies. Or share your own strategies to earn
            additional income.
          </p>
          <ul class="space-y-4">
            {#each [
              "Copy top-performing traders with verified track records",
              "Customize allocation and risk parameters for each copied trader",
              "Share your own strategies and earn commission from followers",
              "Detailed performance analytics for all copied strategies",
              "AI-powered trader matching based on your risk profile",
            ] as item, index}
              <li class="flex items-start gap-3 animate-element fade-in" style="animation-delay: {index * 100}ms">
                <svg class="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Widget Section -->
  <section class="py-24 px-6 relative overflow-hidden animate-section">
    <div class="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-cyan-900/20 z-0"></div>
    <div class="max-w-7xl mx-auto relative z-10">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="animate-element slide-right">
          <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Customizable Dashboard
          </h2>
          <p class="text-gray-300 mb-8 text-lg">
            Build your perfect workspace with our drag-and-drop widget system. Create a personalized trading
            environment that works for you.
          </p>
          <ul class="space-y-4">
            {#each [
              "Drag-and-drop interface for complete layout customization",
              "Over 30 specialized widgets for different trading needs",
              "Save multiple dashboard layouts for different strategies",
              "Real-time data synchronization across all widgets",
              "Share custom layouts with other traders",
            ] as item, index}
              <li class="flex items-start gap-3 animate-element fade-in" style="animation-delay: {index * 100}ms">
                <svg class="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-element slide-left">
          <div class="aspect-video bg-gradient-to-br from-cyan-900/50 to-blue-900/50 p-6 backdrop-blur">
            <div class="absolute top-4 left-4 right-4 h-8 bg-gray-800/80 rounded-md flex items-center px-3 gap-2">
              <div class="flex gap-1.5">
                <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
              <div class="text-xs text-gray-400">Custom Dashboard</div>
            </div>

            <div class="mt-12 grid grid-cols-4 grid-rows-3 gap-3 h-[calc(100%-3rem)]">
              <div class="col-span-2 row-span-2 bg-gray-900/60 rounded-lg p-3 flex flex-col animate-element fade-in">
                <div class="text-xs font-medium text-gray-400 mb-2 flex justify-between items-center">
                  <span>Price Chart</span>
                  <div class="flex gap-1">
                    <div class="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                    <div class="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                    <div class="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                  </div>
                </div>
                <div class="flex-1 relative">
                  <svg viewBox="0 0 100 50" class="w-full h-full">
                    <path
                      d="M0,25 Q10,20 20,28 T40,22 T60,30 T80,15 T100,20"
                      fill="none"
                      stroke="url(#gradient3)"
                      stroke-width="2"
                      class="animate-chart"
                    />
                    <defs>
                      <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#06b6d4" />
                        <stop offset="100%" stop-color="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <div class="col-span-2 row-span-1 bg-gray-900/60 rounded-lg p-3 animate-element fade-in" style="animation-delay: 100ms">
                <div class="text-xs font-medium text-gray-400 mb-2">Open Positions</div>
                <div class="space-y-2">
                  <div class="flex justify-between text-xs">
                    <span>BTC/USDT</span>
                    <span class="text-green-500">+2.45%</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span>ETH/USDT</span>
                    <span class="text-red-500">-0.82%</span>
                  </div>
                </div>
              </div>

              <div class="col-span-1 row-span-1 bg-gray-900/60 rounded-lg p-3 animate-element fade-in" style="animation-delay: 200ms">
                <div class="text-xs font-medium text-gray-400 mb-2">P&L</div>
                <div class="text-center">
                  <div class="text-lg font-bold text-green-500">+$1,245</div>
                  <div class="text-xs text-gray-400">Today</div>
                </div>
              </div>

              <div class="col-span-1 row-span-1 bg-gray-900/60 rounded-lg p-3 animate-element fade-in" style="animation-delay: 300ms">
                <div class="text-xs font-medium text-gray-400 mb-2">Win Rate</div>
                <div class="text-center">
                  <div class="text-lg font-bold">68%</div>
                  <div class="text-xs text-gray-400">30 Days</div>
                </div>
              </div>

              <div class="col-span-1 row-span-1 bg-gray-900/60 rounded-lg p-3 animate-element fade-in" style="animation-delay: 400ms">
                <div class="text-xs font-medium text-gray-400 mb-2">Bot Status</div>
                <div class="flex items-center justify-center h-[calc(100%-1.5rem)]">
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span class="text-xs">Active</span>
                  </div>
                </div>
              </div>

              <div class="col-span-3 row-span-1 bg-gray-900/60 rounded-lg p-3 animate-element fade-in" style="animation-delay: 500ms">
                <div class="text-xs font-medium text-gray-400 mb-2">Recent Alerts</div>
                <div class="flex items-center gap-2">
                  <svg class="h-3 w-3 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span class="text-xs">BTC approaching resistance level at $45,200</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section id="pricing" class="py-24 px-6 animate-section">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 animate-element fade-in">
        <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Simple, Transparent Pricing
        </h2>
        <p class="text-gray-300 max-w-3xl mx-auto text-lg">
          Choose the plan that fits your trading needs. All plans include our core journal features.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        {#each plans as plan, index}
          <div class="relative rounded-xl {plan.popular ? 'bg-gradient-to-b from-blue-500/20 to-purple-600/20' : 'bg-gradient-to-b from-gray-800/10 to-gray-800/30'} p-[1px] backdrop-blur-3xl animate-element fade-in" style="animation-delay: {index * 200}ms">
            {#if plan.popular}
              <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </div>
            {/if}
            <div class="relative rounded-xl bg-black p-6 h-full">
              <div class="text-center mb-6">
                <h3 class="text-xl font-semibold mb-2">{plan.name}</h3>
                <div class="flex items-end justify-center gap-1">
                  <span class="text-3xl font-bold">{plan.price}</span>
                  {#if plan.period}
                    <span class="text-gray-400">{plan.period}</span>
                  {/if}
                </div>
                <p class="text-gray-400 mt-2">{plan.description}</p>
              </div>
              <ul class="space-y-3 mb-8">
                {#each plan.features as feature, i}
                  <li class="flex items-center gap-2 animate-element fade-in" style="animation-delay: {(index * 200) + (i * 100)}ms">
                    <svg class="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span class="text-sm">{feature}</span>
                  </li>
                {/each}
              </ul>
              <div class="mt-auto">
                <button class="w-full {plan.popular ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90' : 'bg-white/10 hover:bg-white/20'} px-4 py-2 rounded-md">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="py-24 px-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30 animate-section">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 animate-element fade-in">
        Start Your Trading Journey Today
      </h2>
      <p class="text-gray-300 mb-8 max-w-2xl mx-auto text-lg animate-element fade-in" style="animation-delay: 100ms">
        Join thousands of successful traders who trust our platform to improve their trading performance
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center animate-element fade-in" style="animation-delay: 200ms">
        <button 
          on:click={toggleDemo}
          class="border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-md flex items-center mx-auto"
        >
          <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Watch Demo
        </button>
        <button class="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 px-4 py-2 rounded-md">
          Get Started Free
        </button>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 px-6 bg-black border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        <div>
          <h3 class="font-semibold mb-4">Product</h3>
          <ul class="space-y-2">
            {#each ["Features", "Pricing", "Integrations", "Changelog", "Roadmap"] as item, i}
              <li>
                <a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">
                  {item}
                </a>
              </li>
            {/each}
          </ul>
        </div>
        <div>
          <h3 class="font-semibold mb-4">Resources</h3>
          <ul class="space-y-2">
            {#each ["Documentation", "Tutorials", "Blog", "API", "Community"] as item, i}
              <li>
                <a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">
                  {item}
                </a>
              </li>
            {/each}
          </ul>
        </div>
        <div>
          <h3 class="font-semibold mb-4">Company</h3>
          <ul class="space-y-2">
            {#each ["About", "Careers", "Contact", "Privacy", "Terms"] as item, i}
              <li>
                <a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">
                  {item}
                </a>
              </li>
            {/each}
          </ul>
        </div>
        <div>
          <h3 class="font-semibold mb-4">Connect</h3>
          <ul class="space-y-2">
            {#each ["Twitter", "Discord", "Telegram", "YouTube", "GitHub"] as item, i}
              <li>
                <a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">
                  {item}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <div class="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
        <div class="flex items-center gap-2 mb-4 md:mb-0">
          <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <span class="font-medium">TradingJournal</span>
        </div>
        <div class="text-sm text-gray-400">© {new Date().getFullYear()} TradingJournal. All rights reserved.</div>
      </div>
    </div>
  </footer>

  <!-- Demo Modal -->
  {#if showDemo}
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" on:click={toggleDemo}>
      <div
        class="bg-black border border-white/10 rounded-xl p-6 max-w-4xl w-full mx-4"
        on:click|stopPropagation
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-2xl font-bold">Product Demo</h3>
          <button class="text-gray-400 hover:text-white" on:click={toggleDemo}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
          <div class="text-center">
            <svg class="h-16 w-16 mx-auto mb-4 text-blue-500 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <p class="text-gray-400">Demo video would play here</p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Add will-change hints for elements that will animate */
  .animate-section {
    opacity: 0;
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    will-change: opacity, transform;
  }
  
  .animate-section.animate-visible {
    opacity: 1;
  }
  
  .animate-element {
    opacity: 0;
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    will-change: opacity, transform;
  }
  
  .animate-element.animate-visible {
    opacity: 1;
    transform: translateY(0) translateX(0) scale(1);
  }
  
  /* Use more efficient transform properties for animations */
  .slide-right {
    transform: translateX(-20px);
  }
  
  .slide-left {
    transform: translateX(20px);
  }
  
  .fade-in {
    transform: translateY(15px);
  }
  
  /* Use efficient properties for animations */
  @media (prefers-reduced-motion: reduce) {
    .animate-section,
    .animate-element {
      transition: opacity 0.1s ease-out !important;
      transform: none !important;
    }
    
    .slide-right,
    .slide-left,
    .fade-in {
      transform: none !important;
    }
  }
  
  /* Base styles */
  .inset-0 {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
  
  .absolute {
    position: absolute;
  }
  
  .relative {
    position: relative;
  }
  
  .fixed {
    position: fixed;
  }
  
  .z-0 {
    z-index: 0;
  }
  
  .z-10 {
    z-index: 10;
  }
  
  .z-50 {
    z-index: 50;
  }
  
  .overflow-hidden {
    overflow: hidden;
  }
  
  .pointer-events-none {
    pointer-events: none;
  }
  
  .min-h-screen {
    min-height: 100vh;
  }
  
  .bg-black {
    background-color: black;
  }
  
  .text-white {
    color: white;
  }
  
  .text-gray-300 {
    color: rgb(209, 213, 219);
  }
  
  .text-gray-400 {
    color: rgb(156, 163, 175);
  }
  
  .text-green-500 {
    color: rgb(34, 197, 94);
  }
  
  .text-red-500 {
    color: rgb(239, 68, 68);
  }
  
  .text-blue-500 {
    color: rgb(59, 130, 246);
  }
  
  .text-yellow-500 {
    color: rgb(234, 179, 8);
  }
  
  .bg-gradient-to-r {
    background-image: linear-gradient(to right, var(--tw-gradient-stops));
  }
  
  .from-blue-500 {
    --tw-gradient-from: rgb(59, 130, 246);
    --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(59 130 246 / 0));
  }
  
  .to-purple-600 {
    --tw-gradient-to: rgb(147, 51, 234);
  }
  
  .bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
  }
  
  .text-transparent {
    color: transparent;
  }
  
  /* Animation for chart paths */
  @keyframes chart {
    0% {
      stroke-dashoffset: 1000;
    }
    100% {
      stroke-dashoffset: 0;
    }
  }
  
  .animate-chart {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: chart 10s ease-in-out forwards infinite;
  }
  
  /* Scroll animations */
  .animate-section {
    opacity: 0;
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  }
  
  .animate-section.animate-visible {
    opacity: 1;
  }
  
  .animate-element {
    opacity: 0;
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  }
  
  .animate-element.animate-visible {
    opacity: 1;
    transform: translateY(0) translateX(0) scale(1);
  }
  
  .slide-right {
    transform: translateX(-30px);
  }
  
  .slide-left {
    transform: translateX(30px);
  }
  
  .fade-in {
    transform: translateY(20px);
  }
  
  .grow-up {
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.6s ease-out;
  }
  
  .grow-up.animate-visible {
    transform: scaleY(1);
  }
  
  /* Responsive utilities */
  @media (min-width: 768px) {
    .md\:grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    
    .md\:grid-cols-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    
    .md\:order-1 {
      order: 1;
    }
    
    .md\:order-2 {
      order: 2;
    }
    
    .md\:text-4xl {
      font-size: 2.25rem;
      line-height: 2.5rem;
    }
    
    .md\:flex-row {
      flex-direction: row;
    }
    
    .md\:mb-0 {
      margin-bottom: 0;
    }
  }
  
  @media (min-width: 1024px) {
    .lg\:grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    
    .lg\:grid-cols-7 {
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }
  }
</style>