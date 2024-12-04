<!-- src/routes/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { auth } from '$lib/stores/authStore';
    import { goto } from '$app/navigation';
    import Button from '$lib/components/common/Button.svelte';

    let showDemo = false;
    let currentFeatureIndex = 0;
    let features = [
        {
            title: 'Advanced Analytics',
            description: 'Gain deep insights into your trading performance with professional-grade analytics.',
            icon: 'fa-chart-line',
            color: 'from-blue-500 to-purple-500'
        },
        {
            title: 'Risk Management',
            description: 'Stay in control with advanced risk management tools and real-time monitoring.',
            icon: 'fa-shield-alt',
            color: 'from-green-500 to-teal-500'
        },
        {
            title: 'Trade Journal',
            description: 'Document your trades with rich media, annotations, and detailed analysis.',
            icon: 'fa-book',
            color: 'from-yellow-500 to-orange-500'
        },
        {
            title: 'Performance Tracking',
            description: 'Track your progress with comprehensive performance metrics and reports.',
            icon: 'fa-chart-bar',
            color: 'from-pink-500 to-red-500'
        }
    ];

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

    let stats = [
        { label: 'Active Users', value: '10,000+' },
        { label: 'Trades Tracked', value: '1M+' },
        { label: 'Success Rate', value: '94%' },
        { label: 'Countries', value: '150+' }
    ];

    onMount(() => {
        if ($auth?.isAuthenticated) {
            goto('/dashboard');
        }

        // Auto-rotate features
        const interval = setInterval(() => {
            currentFeatureIndex = (currentFeatureIndex + 1) % features.length;
        }, 5000);

        return () => clearInterval(interval);
    });
</script>

<div class="min-h-screen bg-slate-900 text-white">
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
        <!-- Background Animation -->
        <div class="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700">
            <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        </div>

        <!-- Hero Content -->
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div class="text-center">
                <h1 class="text-4xl md:text-6xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    Master Your Trading Journey
                </h1>
                <p class="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto">
                    Professional-grade trading journal with advanced analytics, risk management, and performance tracking.
                </p>
                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <Button 
                        variant="primary"
                        class="text-lg px-8 py-4"
                        on:click={() => goto('/register')}
                    >
                        Get Started Free
                    </Button>
                    <Button 
                        variant="secondary"
                        class="text-lg px-8 py-4"
                        on:click={() => showDemo = true}
                    >
                        Watch Demo
                    </Button>
                </div>
            </div>
        </div>

        <!-- Floating Charts Animation -->
        <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2">
            <div class="relative w-[800px] h-[400px] opacity-50">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900"></div>
                <svg viewBox="0 0 800 400" class="w-full h-full">
                    <!-- Candlestick Chart Animation -->
                    <path d="M0,200 Q200,100 400,300 T800,200" class="stroke-blue-500 fill-none animate-chart"></path>
                    <path d="M0,250 Q200,150 400,350 T800,250" class="stroke-purple-500 fill-none animate-chart-delayed"></path>
                </svg>
            </div>
        </div>
    </div>

    <!-- Features Section -->
    <div class="py-24 bg-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
                <p class="text-slate-400">Everything you need to succeed in trading</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {#each features as feature, i}
                    <div 
                        class="bg-slate-700 rounded-xl p-6 transform hover:scale-105 "
                        style="animation-delay: {i * 200}ms"
                    >
                        <div class="w-12 h-12 rounded-lg bg-gradient-to-br {feature.color} flex items-center justify-center mb-4">
                            <i class="fas {feature.icon} text-xl"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">{feature.title}</h3>
                        <p class="text-slate-400">{feature.description}</p>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Stats Section -->
    <div class="py-24 bg-gradient-to-br from-blue-600 to-purple-700 relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
                {#each stats as stat}
                    <div class="text-center">
                        <div class="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                        <div class="text-slate-300">{stat.label}</div>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Testimonials Section -->
    <div class="py-24 bg-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold mb-4">What Traders Say</h2>
                <p class="text-slate-400">Join thousands of successful traders</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                {#each testimonials as testimonial}
                    <div class="bg-slate-700 rounded-xl p-6">
                        <div class="text-4xl mb-4">{testimonial.avatar}</div>
                        <p class="text-slate-300 mb-4">"{testimonial.content}"</p>
                        <div class="font-semibold">{testimonial.name}</div>
                        <div class="text-slate-400 text-sm">{testimonial.role}</div>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- CTA Section -->
    <div class="py-24 bg-gradient-to-br from-blue-600 to-purple-700 relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div class="text-center">
                <h2 class="text-3xl md:text-4xl font-bold mb-4">Start Your Trading Journey Today</h2>
                <p class="text-xl text-slate-300 mb-8">Join thousands of successful traders who trust our platform</p>
                <Button 
                    variant="primary"
                    class="text-lg px-8 py-4"
                    on:click={() => goto('/register')}
                >
                    Get Started Free
                </Button>
            </div>
        </div>
    </div>

    <!-- Demo Modal -->
    {#if showDemo}
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" on:click={() => showDemo = false}>
            <div class="bg-slate-800 rounded-xl p-6 max-w-4xl w-full mx-4" on:click|stopPropagation>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-2xl font-bold">Product Demo</h3>
                    <button class="text-slate-400 hover:text-white" on:click={() => showDemo = false}>
                        <i class="fas fa-times"></i>
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

    :global(.aspect-w-16) {
        position: relative;
        padding-bottom: 56.25%;
    }

    :global(.aspect-w-16 > *) {
        position: absolute;
        height: 100%;
        width: 100%;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
    }
</style>
