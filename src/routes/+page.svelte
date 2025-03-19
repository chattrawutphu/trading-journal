<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import CosmicNebula from '$lib/components/CosmicNebula.svelte';
    
    // Auth store from your original code
    let auth = { isAuthenticated: false };
    
    // Interactive Grid for background effect
    let canvasRef;
    let containerRef;
    let points = 40;
    let mousePosition = { x: 0, y: 0 };
    let pointsData = [];
  
    // Features data from your original code
    let features = [
        {
            title: 'Advanced Analytics',
            description: 'Gain deep insights into your trading performance with professional-grade analytics.',
        icon: 'chart-line',
        color: 'from-blue-500 to-purple-500',
        image: '/placeholder.svg?height=200&width=300'
        },
        {
            title: 'Risk Management',
            description: 'Stay in control with advanced risk management tools and real-time monitoring.',
        icon: 'shield',
        color: 'from-green-500 to-teal-500',
        image: '/placeholder.svg?height=200&width=300'
        },
        {
            title: 'Trade Journal',
            description: 'Document your trades with rich media, annotations, and detailed analysis.',
        icon: 'book',
        color: 'from-yellow-500 to-orange-500',
        image: '/placeholder.svg?height=200&width=300'
        },
        {
            title: 'Performance Tracking',
            description: 'Track your progress with comprehensive performance metrics and reports.',
        icon: 'bar-chart',
        color: 'from-pink-500 to-red-500',
        image: '/placeholder.svg?height=200&width=300'
        }
    ];

    // Testimonials from your original code
    let testimonials = [
        {
            name: 'Alex Thompson',
            role: 'Professional Trader',
            content: 'This trading journal has completely transformed how I analyze and improve my trading strategy.',
            avatar: '👨‍💼'
        },
        {
            name: 'Sarah Chen',
            role: 'Day Trader',
            content: 'The analytics tools are incredible. I can finally see patterns in my trading I never noticed before.',
            avatar: '👩‍💼'
        },
        {
            name: 'Michael Rodriguez',
            role: 'Swing Trader',
            content: 'The risk management features have helped me maintain discipline and protect my capital.',
            avatar: '👨‍💻'
        }
    ];

    // Stats from your original code
    let stats = [
        { label: 'Active Users', value: '10,000+' },
        { label: 'Trades Tracked', value: '1M+' },
        { label: 'Success Rate', value: '94%' },
        { label: 'Countries', value: '150+' }
    ];
  
    // Partners/integrations section
    const partners = [
      { name: "TradingView", width: 120 },
      { name: "MetaTrader", width: 120 },
      { name: "Interactive Brokers", width: 120 },
      { name: "ThinkorSwim", width: 120 }
    ];
  
    let showDemo = false;
    let currentFeatureIndex = 0;
    let scrollerWidth = 0;
    let scrollerRef;
    let startMarquee = false;
    let shineBorderRef;

    onMount(() => {
      if (auth?.isAuthenticated) {
            goto('/dashboard');
        }

        // Auto-rotate features
        const interval = setInterval(() => {
            currentFeatureIndex = (currentFeatureIndex + 1) % features.length;
        }, 5000);

      // Initialize interactive grid
      initInteractiveGrid();
      window.addEventListener('resize', initInteractiveGrid);
      window.addEventListener('mousemove', handleMouseMove);
  
      // Initialize marquee
      if (scrollerRef) {
        scrollerWidth = scrollerRef.offsetWidth;
        startMarquee = true;
      }
  
      return () => {
        clearInterval(interval);
        window.removeEventListener('resize', initInteractiveGrid);
        window.removeEventListener('mousemove', handleMouseMove);
      };
    });
  
    function initInteractiveGrid() {
      if (!canvasRef || !containerRef) return;
  
      const ctx = canvasRef.getContext('2d');
      if (!ctx) return;
  
      const { width, height } = resizeCanvas();
      const cols = Math.floor(Math.sqrt(points));
      const rows = Math.floor(points / cols);
      const cellWidth = width / cols;
      const cellHeight = height / rows;
  
      pointsData = Array.from({ length: points }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = cellWidth * col + cellWidth / 2;
        const y = cellHeight * row + cellHeight / 2;
        const angle = Math.random() * Math.PI * 2;
  
        return {
          x,
          y,
          translateX: 0,
          translateY: 0,
          minX: cellWidth * col,
          minY: cellHeight * row,
          maxX: cellWidth * (col + 1),
          maxY: cellHeight * (row + 1),
          rotate: angle
        };
      });
  
      draw();
    }
  
    function resizeCanvas() {
      if (!canvasRef || !containerRef) return { width: 0, height: 0 };
  
      const { width, height } = containerRef.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.width = width * dpr;
      canvasRef.height = height * dpr;
      const ctx = canvasRef.getContext('2d');
      ctx.scale(dpr, dpr);
      canvasRef.style.width = `${width}px`;
      canvasRef.style.height = `${height}px`;
      return { width, height };
    }
  
    function handleMouseMove(event) {
      if (!canvasRef) return;
      const rect = canvasRef.getBoundingClientRect();
      mousePosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  
    function draw() {
      if (!canvasRef) return;
      const ctx = canvasRef.getContext('2d');
      if (!ctx) return;
  
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
  
      pointsData.forEach((point) => {
        const distance = Math.sqrt(
          Math.pow(mousePosition.x - point.x, 2) + Math.pow(mousePosition.y - point.y, 2)
        );
        const maxDistance = 120;
  
        if (distance < maxDistance) {
          const force = (1 - distance / maxDistance) * 0.2;
          const angle = Math.atan2(mousePosition.y - point.y, mousePosition.x - point.x);
          point.translateX = Math.cos(angle) * force * 20;
          point.translateY = Math.sin(angle) * force * 20;
          point.rotate = angle;
        } else {
          point.translateX *= 0.8;
          point.translateY *= 0.8;
        }
  
        ctx.save();
        ctx.translate(point.x + point.translateX, point.y + point.translateY);
        ctx.rotate(point.rotate);
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(4, 0);
        ctx.stroke();
        ctx.restore();
      });
  
      requestAnimationFrame(draw);
    }
  
    function handleShineBorderMouseMove(e) {
      if (!shineBorderRef) return;
      const { left, top, width, height } = shineBorderRef.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top) / height;
  
      shineBorderRef.style.setProperty('--mouse-x', `${x * 100}%`);
      shineBorderRef.style.setProperty('--mouse-y', `${y * 100}%`);
    }
</script>

  <div class="relative bg-black text-white antialiased min-h-screen">
    <!-- Cosmic Nebula Background -->
    <div class="absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none">
        <CosmicNebula />
    </div>

    <!-- Header with Cosmic Nebula Background -->
    <header class="absolute top-0 left-0 right-0 z-50 h-16 bg-transparent">
      
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
    <section class="relative min-h-screen pt-32 pb-16 overflow-hidden bg-transparent">
      <!-- Interactive Grid -->
      <div bind:this={containerRef} class="absolute inset-0">
        <canvas bind:this={canvasRef} class="absolute inset-0 opacity-30"></canvas>
      </div>
  
      <!-- Shine Border -->
      <div 
        bind:this={shineBorderRef} 
        on:mousemove={handleShineBorderMouseMove}
        class="relative z-10 max-w-6xl mx-auto px-6 group"
        style="--shine-duration: 2000ms"
      >
        <div class="absolute inset-0 rounded-xl border border-white/10 rounded-xl overflow-hidden">
          <!-- Removing hover effect -->
        </div>

        <div class="text-center mb-16 bg-black/20 backdrop-blur-2xl rounded-xl p-6">
          <h1 class="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Master Your Trading
            <br />
            <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Journey</span>
                </h1>
          <p class="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                    Professional-grade trading journal with advanced analytics, risk management, and performance tracking.
            Take control of your trading strategy and improve your results.
          </p>
          <div class="flex gap-4 justify-center">
            <button 
              class="gap-2 border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-md flex items-center"
              on:click={() => showDemo = true}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Watch Demo
            </button>
            <button 
              class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
                        on:click={() => goto('/register')}
                    >
                        Get Started Free
            </button>
            </div>
        </div>
    </div>
    </section>
  
    <!-- Partners Section -->
    <section class="py-16">
      <div class="flex overflow-hidden" style="mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent)">
        <div 
          bind:this={scrollerRef}
          class="flex min-w-full shrink-0 gap-4 py-4"
          style={startMarquee ? `animation: scroll-left ${scrollerWidth / 30}s linear infinite` : ''}
        >
          {#each partners as partner}
            <div class="flex items-center justify-center w-48 h-16">
              <div class="opacity-50 hover:opacity-100 transition-opacity text-center">
                <div class="w-24 h-8 bg-gradient-to-r from-blue-500/30 to-purple-600/30 rounded-md mx-auto mb-2"></div>
                <div class="text-sm text-gray-400">{partner.name}</div>
              </div>
            </div>
          {/each}
        </div>
        <div 
          class="flex min-w-full shrink-0 gap-4 py-4"
          style={startMarquee ? `animation: scroll-left ${scrollerWidth / 30}s linear infinite` : ''}
        >
          {#each partners as partner}
            <div class="flex items-center justify-center w-48 h-16">
              <div class="opacity-50 hover:opacity-100 transition-opacity text-center">
                <div class="w-24 h-8 bg-gradient-to-r from-blue-500/30 to-purple-600/30 rounded-md mx-auto mb-2"></div>
                <div class="text-sm text-gray-400">{partner.name}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>
  
    <!-- Features Section -->
    <section id="features" class="py-16 px-6">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          Powerful Trading Features
        </h2>
        <p class="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Everything you need to succeed in trading. Our comprehensive tools help you analyze, track, and improve
          your trading performance with professional-grade features.
        </p>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {#each features as feature}
            <div class="relative rounded-xl bg-gradient-to-b from-neutral-800/10 to-neutral-800/30 p-[1px] backdrop-blur-3xl">
              <div class="relative rounded-xl bg-black p-6 h-full">
                        <div class="w-12 h-12 rounded-lg bg-gradient-to-br {feature.color} flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                    {#if feature.icon === 'chart-line'}
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                      <polyline points="16 7 22 7 22 13"></polyline>
                    {:else if feature.icon === 'shield'}
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    {:else if feature.icon === 'book'}
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    {:else if feature.icon === 'bar-chart'}
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
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

    <!-- Stats Section -->
    <section id="stats" class="py-16 px-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30">
      <div class="max-w-4xl mx-auto">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
                {#each stats as stat}
                    <div class="text-center">
              <div class="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">{stat.value}</div>
              <div class="text-gray-400">{stat.label}</div>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Testimonials Section -->
    <section id="testimonials" class="py-16 px-6">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          What Traders Say
        </h2>
        <p class="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Join thousands of successful traders who have improved their performance with our platform
        </p>
        <div class="grid md:grid-cols-3 gap-8">
                {#each testimonials as testimonial}
            <div class="relative rounded-xl bg-gradient-to-b from-neutral-800/10 to-neutral-800/30 p-[1px] backdrop-blur-3xl">
              <div class="relative rounded-xl bg-black p-6 h-full">
                        <div class="text-4xl mb-4">{testimonial.avatar}</div>
                <p class="text-gray-300 mb-4">"{testimonial.content}"</p>
                        <div class="font-semibold">{testimonial.name}</div>
                <div class="text-gray-400 text-sm">{testimonial.role}</div>
                    </div>
            </div>
          {/each}
        </div>
    </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 px-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold mb-4">Start Your Trading Journey Today</h2>
        <p class="text-gray-400 mb-8 max-w-2xl mx-auto">
          Join thousands of successful traders who trust our platform to improve their trading performance
        </p>
        <button 
          class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-md hover:opacity-90 transition-opacity"
                    on:click={() => goto('/register')}
                >
                    Get Started Free
        </button>
            </div>
    </section>

    <!-- Demo Modal -->
    {#if showDemo}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" on:click={() => showDemo = false}>
        <div class="bg-black border border-white/10 rounded-xl p-6 max-w-4xl w-full mx-4" on:click|stopPropagation>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-2xl font-bold">Product Demo</h3>
            <button class="text-gray-400 hover:text-white" on:click={() => showDemo = false}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
                    </button>
                </div>
                <div class="aspect-w-16 aspect-h-9">
                    <iframe
                        src="about:blank"
                        class="w-full h-full rounded-lg"
                        title="Product Demo"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                    ></iframe>
                </div>
            </div>
        </div>
    {/if}
</div>

  <style>
    @keyframes scroll-left {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(-100%);
      }
    }
  
    .animate-chart {
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        animation: draw 3s ease-in-out infinite;
    }

    .animate-chart-delayed {
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        animation: draw 3s ease-in-out infinite;
        animation-delay: 1.5s;
    }

    @keyframes draw {
        to {
            stroke-dashoffset: 0;
        }
    }

    :global(body) {
      margin: 0;
      background-color: black;
      color: white;
    }
  
    .aspect-video {
      aspect-ratio: 16 / 9;
    }
  
    .aspect-w-16 {
        position: relative;
        padding-bottom: 56.25%;
    }

    .aspect-w-16 > * {
        position: absolute;
        height: 100%;
        width: 100%;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
    }
</style>