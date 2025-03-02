<script>
    import { onMount } from 'svelte';
    
    // Props
    export let script = {
        name: '',
        conditions: [],
        actions: []
    };
    
    // Local state
    let generatedJson = '';
    let showCopied = false;
    let prettyPrint = true;
    let colorize = true;
    
    // Reference to pre element for syntax highlighting
    let preElement;
    
    // Generate JSON whenever script changes
    $: {
        if (script) {
            generateJson();
        }
    }
    
    // Function to generate JSON from the visual script
    function generateJson() {
        if (!script || !script.conditions || !script.actions) {
            generatedJson = '// No script defined';
            return;
        }
        
        // Create the JSON structure
        const strategyJson = {
            version: "1.0",
            metadata: {
                name: script.name || 'Untitled Strategy',
                createdAt: new Date().toISOString(),
                type: "trading_strategy"
            },
            configuration: {
                // We would pull these from the actual strategy if available
                symbol: "BTCUSDT", // Example - should be replaced with actual value
                timeframe: "1h",   // Example - should be replaced with actual value
                execution: {
                    frequency: "1m",
                    autoStart: false
                }
            },
            logic: {
                conditions: script.conditions.map(condition => {
                    // Extract and format condition parameters
                    const paramObject = {};
                    if (condition.params) {
                        condition.params.forEach(param => {
                            paramObject[param.name] = param.value !== undefined ? param.value : param.default;
                        });
                    }
                    
                    return {
                        id: condition.id,
                        name: condition.name,
                        type: condition.id.split('_')[0], // Extract the base type
                        params: paramObject,
                        disabled: condition.disabled || false,
                        not: condition.not || false
                    };
                }),
                actions: script.actions.map(action => {
                    // Extract and format action parameters
                    const paramObject = {};
                    if (action.params) {
                        action.params.forEach(param => {
                            paramObject[param.name] = param.value !== undefined ? param.value : param.default;
                        });
                    }
                    
                    return {
                        id: action.id,
                        name: action.name,
                        type: action.id.split('_')[0], // Extract the base type
                        params: paramObject,
                        disabled: action.disabled || false
                    };
                })
            },
            advanced: {
                conditionOperators: script.conditionOperators || [],
                containers: [] // Would be populated with nested container structure if available
            }
        };
        
        // Format JSON based on prettyPrint setting
        generatedJson = prettyPrint 
            ? JSON.stringify(strategyJson, null, 2) 
            : JSON.stringify(strategyJson);
            
        // Apply syntax highlighting after DOM update
        setTimeout(() => {
            if (preElement && colorize) {
                highlightJson();
            }
        }, 0);
    }
    
    // Function to copy JSON to clipboard
    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(generatedJson);
            showCopied = true;
            setTimeout(() => {
                showCopied = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }
    
    // Toggle between pretty-printed and compact JSON
    function togglePrettyPrint() {
        prettyPrint = !prettyPrint;
        generateJson();
    }
    
    // Toggle JSON syntax highlighting
    function toggleColorize() {
        colorize = !colorize;
        if (colorize) {
            highlightJson();
        } else {
            if (preElement) {
                preElement.innerHTML = generatedJson;
            }
        }
    }
    
    // Syntax highlighting function
    function highlightJson() {
        if (!preElement || !generatedJson) return;
        
        // Replace with syntax highlighted HTML
        let highlighted = generatedJson
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            })
            .replace(/({|}|\[|\]|,)/g, '<span class="json-bracket">$1</span>');
            
        preElement.innerHTML = highlighted;
    }
    
    // Apply highlighting on mount and when JSON changes
    onMount(() => {
        if (colorize) {
            highlightJson();
        }
    });
</script>

<div class="visual-script-preview">
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-light-text dark:text-dark-text flex items-center">
            <svg class="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            JSON Configuration
        </h3>
        <div class="flex items-center gap-2">
            <button 
                class="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-light-hover dark:bg-dark-hover/80 text-light-text dark:text-dark-text hover:bg-theme-100 dark:hover:bg-theme-900/40 border border-light-border dark:border-dark-border/50 transition-colors duration-200"
                on:click={toggleColorize}
                title={colorize ? "Turn off syntax highlighting" : "Turn on syntax highlighting"}
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {colorize ? 'Plain' : 'Colorize'}
            </button>
            
            <button 
                class="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-light-hover dark:bg-dark-hover/80 text-light-text dark:text-dark-text hover:bg-theme-100 dark:hover:bg-theme-900/40 border border-light-border dark:border-dark-border/50 transition-colors duration-200"
                on:click={togglePrettyPrint}
                title={prettyPrint ? "Switch to compact JSON" : "Switch to pretty-printed JSON"}
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                {prettyPrint ? 'Compact' : 'Pretty'}
            </button>
            
            <button 
                class="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg {showCopied ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-light-hover dark:bg-dark-hover/80 text-light-text dark:text-dark-text hover:bg-theme-100 dark:hover:bg-theme-900/40 border-light-border dark:border-dark-border/50'} border transition-colors duration-200"
                on:click={copyToClipboard}
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={showCopied ? "M5 13l4 4L19 7" : "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"} />
                </svg>
                {showCopied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    </div>
    
    <div class="json-container card p-0 overflow-hidden rounded-lg border border-light-border dark:border-dark-border/50 shadow-lg">
        <div class="json-header flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-900/30 dark:to-indigo-900/30 border-b border-light-border dark:border-dark-border/50">
            <div class="flex items-center">
                <div class="flex space-x-1.5">
                    <div class="w-3 h-3 rounded-full bg-red-400"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div class="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span class="ml-3 text-xs font-mono text-light-text-muted dark:text-dark-text-muted opacity-70">trading-strategy.json</span>
            </div>
            <div class="text-xs font-mono text-light-text-muted dark:text-dark-text-muted opacity-70">{prettyPrint ? 'formatted' : 'minified'}</div>
        </div>
        <div class="line-numbers-container flex overflow-auto max-h-[500px]">
            {#if prettyPrint}
            <div class="line-numbers p-4 bg-light-hover/50 dark:bg-dark-hover/30 text-right pr-2 select-none border-r border-light-border dark:border-dark-border/30 font-mono text-xs text-light-text-muted dark:text-dark-text-muted">
                {#each generatedJson.split('\n') as _, i}
                    <div>{i + 1}</div>
                {/each}
            </div>
            {/if}
            <pre
                bind:this={preElement}
                class="text-sm p-4 font-mono whitespace-pre-wrap text-light-text dark:text-dark-text overflow-auto w-full"
            >{generatedJson}</pre>
        </div>
    </div>
</div>

<style lang="postcss">
    .json-container {
        @apply bg-light-card dark:bg-dark-card;
    }
    
    .json-header {
        background-blend-mode: overlay;
    }
    
    pre {
        tab-size: 2;
    }
    
    /* JSON Syntax Highlighting */
    :global(.json-string) {
        @apply text-green-600 dark:text-green-400;
    }
    
    :global(.json-number) {
        @apply text-blue-600 dark:text-blue-400;
    }
    
    :global(.json-boolean) {
        @apply text-orange-600 dark:text-orange-400;
    }
    
    :global(.json-null) {
        @apply text-red-600 dark:text-red-400;
    }
    
    :global(.json-key) {
        @apply text-purple-600 dark:text-purple-400 font-semibold;
    }
    
    :global(.json-bracket) {
        @apply text-gray-600 dark:text-gray-400;
    }
</style> 