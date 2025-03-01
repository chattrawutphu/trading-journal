<script>
    import { onMount } from 'svelte';
    
    // Props
    export let script = {
        name: '',
        conditions: [],
        actions: []
    };
    
    // Local state
    let generatedCode = '';
    let showCopied = false;
    
    // Generate code whenever script changes
    $: {
        if (script) {
            generateCode();
        }
    }
    
    // Function to generate JavaScript code from the visual script
    function generateCode() {
        if (!script || !script.conditions || !script.actions) {
            generatedCode = '// No script defined';
            return;
        }
        
        let code = `// Trading Bot Script: ${script.name || 'Untitled'}\n`;
        code += `// Generated on ${new Date().toLocaleString()}\n\n`;
        
        // Import section
        code += `// Imports\n`;
        code += `import { TradingBot } from './tradingBot';\n`;
        code += `import { Indicators } from './indicators';\n\n`;
        
        // Initialize bot
        code += `// Initialize bot\n`;
        code += `const bot = new TradingBot();\n\n`;
        
        // Strategy function
        code += `// Strategy definition\n`;
        code += `async function runStrategy() {\n`;
        
        // Variables needed for conditions
        const variables = new Set();
        script.conditions.forEach(condition => {
            if (condition.id.includes('ema')) {
                variables.add('  const indicators = new Indicators(bot.getCandles());\n');
            }
            if (condition.id.includes('rsi')) {
                variables.add('  const indicators = new Indicators(bot.getCandles());\n');
            }
            if (condition.id.includes('price')) {
                variables.add('  const currentPrice = bot.getCurrentPrice();\n');
            }
            if (condition.id.includes('volume')) {
                variables.add('  const currentVolume = bot.getCurrentVolume();\n');
                variables.add('  const averageVolume = bot.getAverageVolume(20);\n');
            }
            if (condition.id.includes('time')) {
                variables.add('  const currentTime = new Date();\n');
            }
        });
        
        // Add variables
        variables.forEach(variable => {
            code += variable;
        });
        
        if (variables.size > 0) {
            code += '\n';
        }
        
        // Conditions
        if (script.conditions.length > 0) {
            code += '  // Check conditions\n';
            code += '  if (\n';
            
            script.conditions.forEach((condition, index) => {
                code += '    ';
                if (index > 0) {
                    code += '&& ';
                }
                
                switch (condition.id) {
                    case 'price_above':
                        code += `currentPrice > ${condition.params.find(p => p.name === 'value').value || 0}`;
                        break;
                    case 'price_below':
                        code += `currentPrice < ${condition.params.find(p => p.name === 'value').value || 0}`;
                        break;
                    case 'ema_crossover':
                        const fastPeriod = condition.params.find(p => p.name === 'fast_period').value || 9;
                        const slowPeriod = condition.params.find(p => p.name === 'slow_period').value || 21;
                        code += `indicators.emaCrossover(${fastPeriod}, ${slowPeriod})`;
                        break;
                    case 'rsi_above':
                        const rsiPeriodAbove = condition.params.find(p => p.name === 'period').value || 14;
                        const rsiValueAbove = condition.params.find(p => p.name === 'value').value || 70;
                        code += `indicators.rsi(${rsiPeriodAbove}) > ${rsiValueAbove}`;
                        break;
                    case 'rsi_below':
                        const rsiPeriodBelow = condition.params.find(p => p.name === 'period').value || 14;
                        const rsiValueBelow = condition.params.find(p => p.name === 'value').value || 30;
                        code += `indicators.rsi(${rsiPeriodBelow}) < ${rsiValueBelow}`;
                        break;
                    case 'volume_spike':
                        const multiplier = condition.params.find(p => p.name === 'multiplier').value || 2;
                        code += `currentVolume > averageVolume * ${multiplier}`;
                        break;
                    case 'time_of_day':
                        const startTime = condition.params.find(p => p.name === 'start_time').value || '09:00';
                        const endTime = condition.params.find(p => p.name === 'end_time').value || '16:00';
                        code += `bot.isTimeInRange(currentTime, '${startTime}', '${endTime}')`;
                        break;
                    default:
                        code += `/* Unknown condition: ${condition.name} */`;
                }
                
                code += (index < script.conditions.length - 1) ? '\n' : '\n  ';
            });
            
            code += ') {\n';
            
            // Actions
            if (script.actions.length > 0) {
                code += '\n    // Execute actions\n';
                
                script.actions.forEach(action => {
                    code += '    ';
                    
                    switch (action.id) {
                        case 'buy_market':
                            const buyAmount = action.params.find(p => p.name === 'amount').value || 0;
                            const buyAmountType = action.params.find(p => p.name === 'amount_type').value || 'USD';
                            code += `await bot.buyMarket(${buyAmount}, '${buyAmountType}');`;
                            break;
                        case 'sell_market':
                            const sellAmount = action.params.find(p => p.name === 'amount').value || 0;
                            const sellAmountType = action.params.find(p => p.name === 'amount_type').value || 'USD';
                            code += `await bot.sellMarket(${sellAmount}, '${sellAmountType}');`;
                            break;
                        case 'buy_limit':
                            const buyLimitPrice = action.params.find(p => p.name === 'price').value || 0;
                            const buyLimitAmount = action.params.find(p => p.name === 'amount').value || 0;
                            const buyLimitAmountType = action.params.find(p => p.name === 'amount_type').value || 'USD';
                            code += `await bot.buyLimit(${buyLimitPrice}, ${buyLimitAmount}, '${buyLimitAmountType}');`;
                            break;
                        case 'sell_limit':
                            const sellLimitPrice = action.params.find(p => p.name === 'price').value || 0;
                            const sellLimitAmount = action.params.find(p => p.name === 'amount').value || 0;
                            const sellLimitAmountType = action.params.find(p => p.name === 'amount_type').value || 'USD';
                            code += `await bot.sellLimit(${sellLimitPrice}, ${sellLimitAmount}, '${sellLimitAmountType}');`;
                            break;
                        case 'set_stop_loss':
                            const stopPrice = action.params.find(p => p.name === 'price').value || 0;
                            const stopType = action.params.find(p => p.name === 'type').value || 'Fixed';
                            
                            if (stopType === 'Fixed') {
                                code += `await bot.setStopLoss(${stopPrice});`;
                            } else {
                                const trailPercent = action.params.find(p => p.name === 'trail_percent').value || 1;
                                code += `await bot.setTrailingStopLoss(${stopPrice}, ${trailPercent});`;
                            }
                            break;
                        case 'set_take_profit':
                            const takeProfitPrice = action.params.find(p => p.name === 'price').value || 0;
                            code += `await bot.setTakeProfit(${takeProfitPrice});`;
                            break;
                        case 'send_notification':
                            const message = action.params.find(p => p.name === 'message').value || '';
                            code += `bot.sendNotification('${message.replace(/'/g, "\\'")}');`;
                            break;
                        default:
                            code += `/* Unknown action: ${action.name} */`;
                    }
                    
                    code += '\n';
                });
            } else {
                code += '    // No actions defined\n';
            }
            
            code += '  }\n';
        } else {
            code += '  // No conditions defined\n';
        }
        
        code += '}\n\n';
        
        // Main execution
        code += `// Start the bot\n`;
        code += `bot.initialize();\n`;
        code += `bot.setInterval(runStrategy, 60000); // Run every minute\n`;
        code += `bot.start();\n`;
        
        generatedCode = code;
    }
    
    // Function to copy code to clipboard
    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(generatedCode);
            showCopied = true;
            setTimeout(() => {
                showCopied = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }
</script>

<div class="visual-script-preview">
    <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-semibold text-light-text dark:text-dark-text">Generated Code</h3>
        <button 
            class="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text hover:bg-theme-100 dark:hover:bg-theme-900/40"
            on:click={copyToClipboard}
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {showCopied ? 'Copied!' : 'Copy'}
        </button>
    </div>
    
    <div class="code-container card p-4 overflow-auto max-h-[500px]">
        <pre class="text-sm text-light-text dark:text-dark-text font-mono whitespace-pre-wrap">{generatedCode}</pre>
    </div>
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-sm;
    }
    
    .code-container {
        @apply bg-light-hover dark:bg-dark-hover;
    }
</style> 