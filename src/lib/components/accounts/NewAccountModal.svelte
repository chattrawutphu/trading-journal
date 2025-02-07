<script>
    import { createEventDispatcher } from 'svelte';
    import { tick } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import Modal from '../common/Modal.svelte';
    import Button from '../common/Button.svelte';
    import Toast from '../common/Toast.svelte';
    import Input from '../common/Input.svelte';
    import { api } from '$lib/utils/api';
    import ErrorMessage from '../common/ErrorMessage.svelte';
    import TradeHistoryModal from './TradeHistoryModal.svelte';
    import { formatTrades, generateShortGuid, generateAccountName, processTradeImportData } from '$lib/utils/importTrades';

    export let show = false;
    const dispatch = createEventDispatcher();

    let accountName = '';
    let initialBalance = 0;
    let apiKey = '';
    let secretKey = '';
    let passphrase = '';
    let server = '';
    let login = '';
    let password = '';
    let loading = false;
    let error = '';
    let accountType = 'MANUAL'; // Default to manual
    
    // ประกาศตัวแปร selectedType
    let selectedType = null;
    
    // เพิ่ม toast state
    let showToast = false;
    let toastMessage = '';
    let toastType = 'success';

    let ipWhitelistConfirmed = false;  // เพิ่มตัวแปรสำหรับเช็คบ็อกซ์

    let step = 1; // เพิ่มตัวแปรสำหรับ mobile steps

    let tradeHistory = null;
    let showTradeHistory = false;
    let importLoading = false;

    const exchangeTypes = [
        {
            category: 'Manual Trading',
            items: [
                {
                    id: 'MANUAL',
                    name: 'Manual Trading',
                    description: 'Track your trades manually with detailed analytics',
                    icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                           </svg>`,
                    color: '#10B981',
                    requiresApi: false
                }
            ]
        },
        {
            category: 'Crypto Exchanges',
            items: [
                {
                    id: 'BINANCE_FUTURES',
                    name: 'Binance Futures',
                    description: 'Trade crypto futures with up to 125x leverage',
                    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0L7.272 4.728L12 9.456L16.728 4.728L12 0Z"/>
                            <path d="M2.544 9.456L7.272 14.184L12 9.456L7.272 4.728L2.544 9.456Z"/>
                            <path d="M12 9.456L16.728 14.184L21.456 9.456L16.728 4.728L12 9.456Z"/>
                            <path d="M12 18.912L16.728 14.184L12 9.456L7.272 14.184L12 18.912Z"/>
                           </svg>`,
                    color: '#F3BA2F',
                    requiresApi: true
                },
                {
                    id: 'BYBIT',
                    name: 'Bybit',
                    description: 'Advanced crypto derivatives trading platform',
                    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.4,8.3L19.4,8.3L19.4,8.3l0,0c0,0-1.7,0-3.2,0c-1.5,0-2.7,1.2-2.7,2.7v3.2c0,1.5,1.2,2.7,2.7,2.7h3.2
                                   c1.5,0,2.7-1.2,2.7-2.7v-3.2C22.1,9.5,20.9,8.3,19.4,8.3z M19.4,14.8h-3.2v-3.2h3.2V14.8z"/>
                            <path d="M7.8,8.3L7.8,8.3L7.8,8.3l0,0c0,0-1.7,0-3.2,0C3.1,8.3,1.9,9.5,1.9,11v3.2c0,1.5,1.2,2.7,2.7,2.7h3.2
                                   c1.5,0,2.7-1.2,2.7-2.7V11C10.5,9.5,9.3,8.3,7.8,8.3z M7.8,14.8H4.6v-3.2h3.2V14.8z"/>
                           </svg>`,
                    color: '#00b4c9',
                    requiresApi: true
                },
                {
                    id: 'OKEX',
                    name: 'OKX',
                    description: 'Professional crypto trading & derivatives',
                    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2C6.48,2,2,6.48,2,12c0,5.52,4.48,10,10,10s10-4.48,10-10C22,6.48,17.52,2,12,2z M12,18
                                   c-3.31,0-6-2.69-6-6s2.69-6,6-6s6,2.69,6,6S15.31,18,12,18z"/>
                           </svg>`,
                    color: '#121212',
                    requiresApi: true
                }
            ]
        },
        {
            category: 'Forex Brokers',
            items: [
                {
                    id: 'MT4',
                    name: 'MetaTrader 4',
                    description: 'Industry standard forex trading platform',
                    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3.5,18.5L9.5,12.5L13.5,16.5L22,6.92L20.59,5.5L13.5,13.5L9.5,9.5L2,17L3.5,18.5Z"/>
                           </svg>`,
                    color: '#3375BB',
                    requiresApi: true
                },
                {
                    id: 'MT5',
                    name: 'MetaTrader 5',
                    description: 'Next-gen multi-asset trading platform',
                    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4,17L6.75,14.25L6.72,14.23C6.14,13.64 6.14,12.69 6.72,12.11L11.46,7.37L15.7,11.61L9.53,17.79L4,17Z"/>
                            <path d="M15.7,11.61L11.46,7.37L15.7,3.13L20,7.41L15.7,11.61Z"/>
                           </svg>`,
                    color: '#4C6EF5',
                    requiresApi: true
                },
                {
                    id: 'CTRADER',
                    name: 'cTrader',
                    description: 'Modern ECN forex trading platform',
                    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z"/>
                           </svg>`,
                    color: '#00A6E3',
                    requiresApi: true
                }
            ]
        },
        {
            category: 'Spreadsheet Import',
            items: [
                {
                    id: 'SPREADSHEET',
                    name: 'Spreadsheet Import',
                    description: 'Import trades from Excel or CSV files',
                    icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                           </svg>`,
                    color: '#10B981',
                    requiresApi: false
                }
            ]
        }
    ];

    // เพิ่ม IP addresses จาก env
    const whitelistIPs = import.meta.env.VITE_BINANCE_WHITELIST_IPS?.split(',') || [];

    // เพิ่มฟังก์ชัน copy IP
    async function copyIP(ip) {
        await navigator.clipboard.writeText(ip);
        toastType = 'success';
        toastMessage = 'IP copied to clipboard!';
        showToast = true;
    }

    // เพิ่มฟังก์ชัน copy all IPs
    async function copyAllIPs() {
        if (whitelistIPs.length === 0) {
            toastType = 'error';
            toastMessage = 'No IP addresses available to copy';
            showToast = true;
            return;
        }
        
        const ipsText = whitelistIPs.join(', ');
        await navigator.clipboard.writeText(ipsText);
        toastType = 'success';
        toastMessage = 'All IPs copied to clipboard!';
        showToast = true;
    }

    // ปรับปรุงฟังก์ชัน getSelectedType
    function getSelectedType() {
        for (const category of exchangeTypes) {
            const found = category.items.find(item => item.id === accountType);
            if (found) return found;
        }
        return null;
    }

    // สร้างฟังก์ชันสำหรับอัพเดต selectedType
    async function updateSelectedType() {
        selectedType = getSelectedType();
    }

    // เรียกใช้ updateSelectedType เมื่อ accountType เปลี่ยน
    $: accountType && updateSelectedType();

    // เพิ่ม watcher สำหรับ accountType
    $: if (accountType !== 'MANUAL') {
        initialBalance = 0;
    }

    // แยก reset form เป็นฟังก์ชันแยก
    async function resetForm() {
        apiKey = '';
        secretKey = '';
        passphrase = '';
        server = '';
        login = '';
        password = '';
        error = '';
        accountType = 'MANUAL';
        initialBalance = 0;  // Reset initial balance
        await updateSelectedType();
    }

    // ปรับปรุงฟังก์ชัน handleSubmit
    async function handleSubmit() {
        console.log('1. Starting handleSubmit...');
        console.log('Current accountType:', accountType);

        // ตรวจสอบ subscription
        if ($subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC && 
            $accountStore.accounts.length > 0) {
            showUpgradeModal = true;
            return;
        }

        // ตรวจสอบ required fields และ initial balance
        if (!accountName) {
            console.log('Error: Missing account name');
            error = 'Please enter account name';
            return;
        }

        if (initialBalance < 0) {
            console.log('Error: Invalid initial balance');
            error = 'Initial balance cannot be negative';
            return;
        }

        if (accountType === 'BINANCE_FUTURES' && !ipWhitelistConfirmed) {
            error = 'Please confirm that you have whitelisted the IP address';
            return;
        }

        loading = true;
        error = '';

        try {
            if (accountType === 'BINANCE_FUTURES') {
                console.log('2. Testing Binance connection...');
                
                // แสดง toast กำลังทดสอบการเชื่อมต่อ
                toastType = 'info';
                toastMessage = 'Testing Binance connection...';
                showToast = true;

                console.log('3. Sending test connection request with:', {
                    type: 'BINANCE_FUTURES',
                    apiKey,
                    secretKey: '***' // ไม่แสดง secret key จริง
                });

                // ทดสอบการเชื่อมต่อ
                await api.testConnection({
                    type: 'BINANCE_FUTURES',
                    apiKey,
                    secretKey
                });

                console.log('4. Connection test successful');

                // แสดง toast เชื่อมต่อสำเร็จ
                toastType = 'success';
                toastMessage = 'Connection successful!';
                showToast = true;

                // Fetch trade history
                console.log('5. Fetching trade history...');
                const historyResponse = await api.fetchBinanceTradeHistory(apiKey, secretKey);
                console.log('6. Trade history response:', historyResponse);
                
                if (historyResponse && historyResponse.data) {
                    tradeHistory = historyResponse.data;
                    showTradeHistory = true;
                    show = false; // ปิด New Trading Account Modal
                    console.log('7. Showing trade history modal');
                } else {
                    console.error('Invalid trade history response:', historyResponse);
                    throw new Error('Failed to fetch trade history');
                }
                
            } else {
                console.log('2. Creating manual account...');
                loading = true;

                // 1. สร้าง account
                const accountData = {
                    name: accountName,
                    type: accountType,
                    apiKey,
                    secretKey,
                    excludeZeroPnL: false,
                    balance: initialBalance || 0
                };

                await accountStore.createAccount(accountData);
                console.log('3. Account created');

                // 2. รอให้ reload layout เสร็จก่อน
                console.log('4. Reloading layout...');
                await accountStore.loadAccounts();
                dispatch('refreshLayout');

                // 3. แสดง toast และปิด modal
                toastType = 'success';
                toastMessage = 'Account created successfully!';
                showToast = true;
                console.log('5. Showing success toast');

                // 4. รีเซ็ตฟอร์มและปิด modal
                accountName = '';
                initialBalance = 0;
                await resetForm();
                show = false;
                dispatch('close');
            }
            
        } catch (err) {
            console.error('Error in handleSubmit:', err);
            if (err.message.includes('Invalid API-key, IP, or permissions')) {
                error = `Please ensure you have:
                1. Added IP (115.87.234.252) to your Binance API whitelist
                2. Enabled "Enable Reading" permission
                3. Enabled "Enable Futures" permission`;
            } else {
                error = err.message;
            }
            toastType = 'error';
            toastMessage = error;
            showToast = true;
        } finally {
            loading = false;
            console.log('8. handleSubmit complete');
        }
    }

    // ปรับปรุงฟังก์ชัน handleClose
    async function handleClose() {
        show = false;
        step = 1; // รีเซ็ต step เมื่อปิด modal
        accountName = '';
        initialBalance = 0;
        await resetForm();
        dispatch('close');
    }

    // ปรับปรุงฟังก์ชัน handleAccountTypeSelect
    async function handleAccountTypeSelect(typeId) {
        // เคลียร์ค่า API Key และ Secret Key เมื่อเปลี่ยน exchange/broker
        apiKey = '';
        secretKey = '';
        
        // เคลียร์ค่า MT4/MT5 fields ถ้ามี
        server = '';
        login = '';
        password = '';
        
        // เคลียร์ checkbox confirmation
        ipWhitelistConfirmed = false;
        
        // ตั้งค่า account type
        accountType = typeId;
        if (typeId !== 'MANUAL') {
            initialBalance = 0;
        }
        
        // หา exchange type จาก exchangeTypes
        const selectedExchange = getSelectedType();
        if (selectedExchange) {
            // ใช้ generateAccountName function
            accountName = generateAccountName(selectedExchange.name);
        } else {
            accountName = generateAccountName('Trading Account');
        }
        
        await updateSelectedType();
    }

    // ปรับปรุงฟังก์ชัน handleTradeImport
    async function handleTradeImport(event) {
        try {
            importLoading = true;
            const tradeData = event.detail;
            console.log('Importing trades with options:', tradeData);

            // Format trades with excludeZeroPnL option
            const formattedTrades = formatTrades(
                tradeData.trades,
                true,
                [],
                false,
                tradeData.excludeZeroPnL
            );

            // Create account with excludeZeroPnL setting
            const account = await accountStore.createAccount({
                name: accountName,
                type: accountType,
                apiKey,
                secretKey,
                excludeZeroPnL: tradeData.excludeZeroPnL,
                balance: initialBalance || 0
            });

            // Save trades one by one using createTrade
            if (formattedTrades.length > 0) {
                await Promise.all(formattedTrades.map(trade => 
                    api.createTrade({
                        ...trade,
                        account: account._id
                    })
                ));
            }

            // Reload accounts and wait for it to complete
            await accountStore.loadAccounts();
            
            // Then refresh layout
            dispatch('refreshLayout');
            
            // Close both modals
            showTradeHistory = false;
            show = false;
            
            toastType = 'success';
            toastMessage = `Account created with ${formattedTrades.length} trades imported!`;
            showToast = true;

        } catch (err) {
            console.error('Error importing trades:', err);
            error = err.message;
            toastType = 'error';
            toastMessage = `Error importing trades: ${err.message}`;
            showToast = true;
        } finally {
            importLoading = false;
        }
    }

    async function handleTradeHistoryImport(event) {
        try {
            const tradeData = event.detail;
            console.log('Importing trades with options:', tradeData);

            // สร้าง account พร้อมกับ excludeZeroPnL
            const accountData = {
                name: accountName,
                type: accountType,
                apiKey,
                secretKey,
                excludeZeroPnL: tradeData.excludeZeroPnL, // รับค่าจาก TradeHistoryModal
                balance: initialBalance || 0
            };

            const account = await accountStore.createAccount(accountData);
            
            // Format trades with excludeZeroPnL option
            const formattedTrades = formatTrades(
                tradeData.trades,
                true,
                [],
                false,
                tradeData.excludeZeroPnL // ใช้ค่าที่รับมา
            );

            // ... rest of the code
        } catch (err) {
            console.error('Error importing trades:', err);
            error = err.message;
        }
    }
</script>

<!-- Make sure TradeHistoryModal is placed OUTSIDE the main Modal -->
<TradeHistoryModal
    bind:show={showTradeHistory}
    bind:tradeHistory
    loading={importLoading}
    {accountType}
    on:close={() => {
        showTradeHistory = false;
        show = false; // ปิด NewAccountModal ด้วย
        console.log('Trade history modal closed');
    }}
    on:import={handleTradeImport}
/>

<!-- แยก Error Message ออกจาก Toast -->
{#if error}
    <div class="fixed inset-x-0 top-4 z-50 flex justify-center">
        <div class="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-lg mx-4">
            <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 000 2v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm">{error}</span>
            <button 
                class="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-full"
                on:click={() => error = ''}
            >
                <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    </div>
{/if}

<Toast 
    bind:show={showToast}
    message={toastMessage}
    type={toastType}
    duration={3000}
/>

<Modal bind:show on:close={handleClose} showDefaultHeader={false}>
    <div class="w-full max-w-4xl mx-auto max-h-[85vh] flex flex-col bg-gradient-to-br from-light-card/95 to-light-card dark:from-dark-card/95 dark:to-dark-card backdrop-blur-xl rounded-2xl overflow-hidden border border-light-border/10 dark:border-dark-border/10 shadow-2xl">
        <!-- Header -->
        <div class="px-8 py-6 border-b border-light-border/10 dark:border-dark-border/10 bg-light-card/50 dark:bg-dark-card/50 backdrop-blur-xl sticky top-0 z-20">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-3xl font-bold">
                        <span class="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
                        New Trading Account
                        </span>
                    </h2>
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mt-2">
                        Set up your trading account to start tracking your performance
                    </p>
                </div>
                <button 
                    class="p-2 hover:bg-light-hover/80 dark:hover:bg-dark-hover/80 rounded-full transition-all duration-200"
                    on:click={handleClose}
                >
                    <svg class="w-5 h-5 text-light-text-muted dark:text-dark-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Desktop UI (ซ่อนใน mobile) -->
        <div class="hidden md:flex flex-1 min-h-0">
            <form class="flex flex-1 min-h-0" on:submit|preventDefault={handleSubmit}>
            <!-- Left Side: Account Types -->
                <div class="w-72 border-r border-light-border/10 dark:border-dark-border/10 bg-light-card/90 dark:bg-dark-card/90 backdrop-blur-xl overflow-y-auto">
                    <div class="p-4">
                    {#each exchangeTypes as category}
                            <div class="mb-8 last:mb-0">
                                <h3 class="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider px-2 mb-4">
                                {category.category}
                            </h3>
                                <div class="space-y-3">
                                {#each category.items as type}
                                    {@const isSelected = accountType === type.id}
                                    <button
                                        type="button"
                                            class="w-full p-4 rounded-xl text-left transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
                                            style="background: {isSelected 
                                                ? `linear-gradient(135deg, ${type.color}15, ${type.color}25)` 
                                                : 'transparent'}; 
                                                   box-shadow: {isSelected ? `0 0 20px ${type.color}15` : 'none'};
                                                   border: 1px solid {isSelected ? type.color + '40' : 'transparent'}"
                                            on:click={() => handleAccountTypeSelect(type.id)}
                                        >
                                            <!-- เพิ่ม hover effect -->
                                            <div class="absolute inset-0 bg-gradient-to-r from-transparent to-light-hover/5 dark:to-dark-hover/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            
                                            <!-- Content -->
                                            <div class="relative z-10 flex items-center gap-4">
                                                <div class="p-2.5 rounded-xl transition-colors duration-200"
                                                     style="background: {isSelected ? type.color : type.color + '20'};
                                                                color: {isSelected ? 'white' : type.color}">
                                                {@html type.icon}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                    <div class="font-medium text-light-text dark:text-dark-text">
                                                    {type.name}
                                                </div>
                                                    <div class="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                                                    {type.description}
                                                </div>
                                            </div>
                                            {#if isSelected}
                                                    <div class="w-2 h-2 rounded-full animate-pulse"
                                                     style="background-color: {type.color}">
                                                </div>
                                            {/if}
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Right Side: Configuration -->
                <div class="flex-1 flex flex-col min-h-0 max-w-[calc(100%-18rem)]">
            <div class="flex-1 overflow-y-auto">
                        <div class="p-8 pb-24">
                        <div class="space-y-6">
                            <div class="flex items-center justify-between">
                                    <h3 class="text-xl font-semibold text-light-text dark:text-dark-text">
                                    Account Details
                                </h3>
                                    <span class="text-sm px-3 py-1 rounded-full bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted">
                                    {accountType === 'MANUAL' ? 'Basic Information' : 'Connection Details'}
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-6">
                                <Input
                                    label="Account Name"
                                    bind:value={accountName}
                                    placeholder="Enter account name"
                                    required
                                />
                                    {#if accountType === 'MANUAL'}
                                <Input
                                    label="Initial Balance"
                                    type="number"
                                    bind:value={initialBalance}
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                    required
                                />
                                    {/if}
                            </div>

                            <!-- Dynamic Configuration Based on Account Type -->
                                {#if accountType !== 'MANUAL' && selectedType}
                                    {@const currentType = selectedType}
                                    <div class="space-y-6 p-6 rounded-xl"
                                         style="background: linear-gradient(to bottom right, {currentType.color}0D, {currentType.color}1A); 
                                                border: 1px solid {currentType.color}33;">
                                        <!-- Platform-specific configuration -->
                                        <div class="flex items-center gap-3">
                                            <div class="p-2 rounded-lg" 
                                                 style="background-color: {currentType.color}">
                                                <div class="text-white">
                                                    {@html currentType.icon}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 class="font-medium text-light-text dark:text-dark-text">
                                                    {currentType.name} Connection
                                                </h4>
                                                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mt-0.5">
                                                    {currentType.description}
                                                </p>
                                            </div>
                                        </div>

                                        <!-- Platform-specific fields -->
                                        <div class="space-y-4">
                                            {#if ['BINANCE_FUTURES', 'BYBIT', 'OKEX'].includes(accountType)}
                                                <!-- API Requirements Section -->
                                                <div class="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                                    <div class="flex items-start gap-3">
                                                        <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                                        </svg>
                                                        <div class="space-y-3">
                                                            <div>
                                                                <p class="text-sm text-light-text dark:text-dark-text font-medium">
                                                                    API Configuration Steps
                                                                </p>
                                                                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                                                                    Follow these steps to set up your API connection
                                                                </p>
                                                            </div>

                                                            <!-- Step 1: Create API -->
                                                            <div class="space-y-1.5">
                                                                <p class="text-sm font-medium text-light-text dark:text-dark-text">1. Create API Key</p>
                                                                <div class="flex items-center gap-2">
                                                                    <a 
                                                                        href={
                                                                            accountType === 'BINANCE_FUTURES' 
                                                                                ? 'https://www.binance.com/en/my/settings/api-management' 
                                                                                : accountType === 'BYBIT'
                                                                                ? 'https://www.bybit.com/app/user/api-management'
                                                                                : 'https://www.okx.com/account/my-api'
                                                                        } 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        class="text-sm px-2 py-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors inline-flex items-center gap-1"
                                                                    >
                                                                        Go to API Settings
                                                                        <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                                        </svg>
                                                                    </a>
                                                                </div>
                                                            </div>

                                                            <!-- Step 2: IP Whitelist -->
                                                            <div class="space-y-1.5">
                                                                <p class="text-sm font-medium text-light-text dark:text-dark-text">2. Whitelist These IPs</p>
                                                                <div class="flex items-center">
                                                                    <div class="flex-1 overflow-x-auto p-1.5 rounded bg-light-card/50 dark:bg-dark-card/50 scrollbar-thin">
                                                                        <code class="text-sm font-mono text-light-text dark:text-dark-text">
                                                                            {whitelistIPs.length > 0 
                                                                                ? whitelistIPs.join(', ')
                                                                                : 'No IP whitelist configured. Please contact administrator.'}
                                                                        </code>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        class="ml-1.5 p-1 rounded text-blue-500 hover:bg-blue-500/10 transition-colors"
                                                                        on:click={copyAllIPs}
                                                                    >
                                                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <!-- Step 3: Permissions -->
                                                            <div class="space-y-1.5">
                                                                <p class="text-sm font-medium text-light-text dark:text-dark-text">3. Enable Required Permissions</p>
                                                                <ul class="text-sm text-light-text-muted dark:text-dark-text-muted space-y-1 ml-3 list-disc">
                                                                    <li>Enable Reading permission</li>
                                                                    <li>Enable Futures permission</li>
                                                                    <li>Disable Withdrawal permission</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- API Key Input Fields -->
                                                <div class="space-y-1.5">
                                                    <label class="block text-sm font-medium text-light-text dark:text-dark-text">
                                                        API Key *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        bind:value={apiKey}
                                                        required
                                                        placeholder="Enter your API key"
                                                        class="w-full px-3 py-2 bg-light-background dark:bg-dark-background 
                                                               border border-light-border dark:border-dark-border 
                                                               rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent
                                                               text-light-text dark:text-dark-text placeholder-light-text-muted 
                                                               dark:placeholder-dark-text-muted"
                                                    />
                                                </div>

                                                <div class="space-y-1.5">
                                                    <label class="block text-sm font-medium text-light-text dark:text-dark-text">
                                                        Secret Key *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        bind:value={secretKey}
                                                        required
                                                        placeholder="Enter your Secret key"
                                                        class="w-full px-3 py-2 bg-light-background dark:bg-dark-background 
                                                               border border-light-border dark:border-dark-border 
                                                               rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent
                                                               text-light-text dark:text-dark-text placeholder-light-text-muted 
                                                               dark:placeholder-dark-text-muted"
                                                    />
                                                </div>

                                                <!-- Confirmation Checkbox -->
                                                <label class="flex items-start gap-2 p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 transition-colors cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        class="mt-0.5 w-4 h-4 rounded border-light-border dark:border-dark-border text-theme-500 focus:ring-theme-500"
                                                        bind:checked={ipWhitelistConfirmed}
                                                    >
                                                    <span class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                                        I confirm that I have completed all the configuration steps above
                                                    </span>
                                                </label>
                                            {:else if ['MT4', 'MT5'].includes(accountType)}
                                                <Input
                                                    label="Server"
                                                    bind:value={server}
                                                    type="text"
                                                    placeholder="Enter your broker's server address"
                                                    required
                                                />
                                                <Input
                                                    label="Login"
                                                    bind:value={login}
                                                    type="text"
                                                    placeholder="Enter your account login"
                                                    required
                                                />
                                                    <Input
                                                    label="Password"
                                                        type="password"
                                                    bind:value={password}
                                                    placeholder="Enter your account password"
                                                    required
                                                />
                                                
                                                <!-- MT4/MT5 Instructions -->
                                                <div class="mt-6 p-4 bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl border border-light-border/10 dark:border-dark-border/10">
                                                    <div class="flex items-start gap-3">
                                                        <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                                        </svg>
                                                        <div class="space-y-2">
                                                            <p class="text-sm text-light-text dark:text-dark-text font-medium">
                                                                Connection Information
                                                            </p>
                                                            <ul class="text-sm text-light-text-muted dark:text-dark-text-muted space-y-1">
                                                                <li>• Use your broker's server address</li>
                                                                <li>• Enter your account login credentials</li>
                                                                <li>• Data is used for read-only purposes</li>
                                                            </ul>
                                                            <div class="pt-2">
                                                                <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                                                    Contact your broker for server details if needed
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <!-- Desktop Footer -->
                    <div class="p-4 bg-gradient-to-t from-light-card/90 to-light-card/0 dark:from-dark-card/90 dark:to-dark-card/0 border-t border-light-border/10 dark:border-dark-border/10 sticky bottom-0">
                        <div class="flex justify-end gap-2">
                            <Button 
                                variant="secondary" 
                                type="button"
                                size="sm"
                                on:click={handleClose}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary"
                                type="submit"
                                size="sm"
                                {loading}
                                disabled={accountType === 'BINANCE_FUTURES' && !ipWhitelistConfirmed}
                                class="bg-gradient-to-r from-purple-500/80 to-indigo-500/80 transition-all
                                       {accountType === 'BINANCE_FUTURES' && !ipWhitelistConfirmed 
                                           ? 'opacity-50 cursor-not-allowed' 
                                           : 'hover:from-purple-500/90 hover:to-indigo-500/90'}"
                            >
                                {#if loading}
                                    Connecting...
                                {:else}
                                    {accountType === 'MANUAL' ? 'Create Account' : 'Connect'}
                                {/if}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>

        <!-- Mobile UI -->
        <div class="flex flex-col flex-1 min-h-0 md:hidden">
            <form class="flex flex-col flex-1 min-h-0" on:submit|preventDefault={handleSubmit}>
                <!-- Step indicator -->
                <div class="px-4 py-3 border-b border-light-border/10 dark:border-dark-border/10">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                                {step === 1 ? 'bg-theme-500 text-white' : 'bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted'}">
                                1
                            </span>
                            <span class="h-0.5 w-8 bg-light-border/50 dark:bg-dark-border/50"></span>
                            <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                                {step === 2 ? 'bg-theme-500 text-white' : 'bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted'}">
                                2
                            </span>
                        </div>
                        <span class="text-sm text-light-text-muted dark:text-dark-text-muted">
                            {step === 1 ? 'Select Account Type' : 'Configure Account'}
                        </span>
                    </div>
                </div>

                <!-- Step 1: Account Type Selection -->
                {#if step === 1}
                    <div class="flex-1 overflow-y-auto p-4">
                        {#each exchangeTypes as category}
                            <div class="mb-6 last:mb-0">
                                <h3 class="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider mb-3">
                                    {category.category}
                                </h3>
                                <div class="space-y-2">
                                    {#each category.items as type}
                                        <button
                                            class="w-full p-3 rounded-lg border border-light-border/10 dark:border-dark-border/10
                                                   bg-light-card dark:bg-dark-card hover:bg-light-hover dark:hover:bg-dark-hover
                                                   transition-colors flex items-center gap-3"
                                            on:click={() => {
                                                handleAccountTypeSelect(type.id);
                                                step = 2;
                                            }}
                                        >
                                            <div class="p-2 rounded-lg" style="background-color: {type.color}">
                                                <div class="text-white">
                                                    {@html type.icon}
                                                </div>
                                            </div>
                                            <div class="flex-1 text-left">
                                                <div class="font-medium text-light-text dark:text-dark-text">
                                                    {type.name}
                                                </div>
                                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                                    {type.description}
                                                </div>
                                            </div>
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}

                <!-- Step 2: Account Configuration -->
                {#if step === 2}
                    <div class="flex-1 overflow-y-auto">
                        <div class="p-4 space-y-6">
                            <!-- Back button -->
                            <button
                                class="flex items-center gap-2 text-sm text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 transition-colors"
                                on:click={() => step = 1}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                                </svg>
                                Back to Account Types
                            </button>

                            <!-- Account configuration form -->
                            <div class="space-y-6">
                                <div class="grid grid-cols-2 gap-6">
                                    <Input
                                        label="Account Name"
                                        bind:value={accountName}
                                        placeholder="Enter account name"
                                        required
                                    />
                                    {#if accountType === 'MANUAL'}
                                        <Input
                                            label="Initial Balance"
                                            type="number"
                                            bind:value={initialBalance}
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                                        required
                                                    />
                                                {/if}
                                </div>

                                <!-- Dynamic Configuration Based on Account Type -->
                                {#if accountType !== 'MANUAL' && selectedType}
                                    {@const currentType = selectedType}
                                    <div class="space-y-6 p-6 rounded-xl"
                                         style="background: linear-gradient(to bottom right, {currentType.color}0D, {currentType.color}1A); 
                                                border: 1px solid {currentType.color}33;">
                                        <!-- Platform-specific configuration -->
                                        <div class="flex items-center gap-3">
                                            <div class="p-2 rounded-lg" 
                                                 style="background-color: {currentType.color}">
                                                <div class="text-white">
                                                    {@html currentType.icon}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 class="font-medium text-light-text dark:text-dark-text">
                                                    {currentType.name} Connection
                                                </h4>
                                                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mt-0.5">
                                                    {currentType.description}
                                                </p>
                                            </div>
                                        </div>

                                        <!-- Platform-specific fields -->
                                        <div class="space-y-4">
                                            {#if ['BINANCE_FUTURES', 'BYBIT', 'OKEX'].includes(accountType)}
                                                <!-- API Requirements Section -->
                                                <div class="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                                    <div class="flex items-start gap-3">
                                                        <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                                        </svg>
                                                        <div class="space-y-3">
                                                            <div>
                                                                <p class="text-sm text-light-text dark:text-dark-text font-medium">
                                                                    API Configuration Steps
                                                                </p>
                                                                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                                                                    Follow these steps to set up your API connection
                                                                </p>
                                                            </div>

                                                            <!-- Step 1: Create API -->
                                                            <div class="space-y-1.5">
                                                                <p class="text-sm font-medium text-light-text dark:text-dark-text">1. Create API Key</p>
                                                                <div class="flex items-center gap-2">
                                                                    <a 
                                                                        href={
                                                                            accountType === 'BINANCE_FUTURES' 
                                                                                ? 'https://www.binance.com/en/my/settings/api-management' 
                                                                                : accountType === 'BYBIT'
                                                                                ? 'https://www.bybit.com/app/user/api-management'
                                                                                : 'https://www.okx.com/account/my-api'
                                                                        } 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        class="text-sm px-2 py-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors inline-flex items-center gap-1"
                                                                    >
                                                                        Go to API Settings
                                                                        <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                                        </svg>
                                                                    </a>
                                                                </div>
                                                            </div>

                                                            <!-- Step 2: IP Whitelist -->
                                                            <div class="space-y-1.5">
                                                                <p class="text-sm font-medium text-light-text dark:text-dark-text">2. Whitelist These IPs</p>
                                                                <div class="flex items-center">
                                                                    <div class="flex-1 overflow-x-auto p-1.5 rounded bg-light-card/50 dark:bg-dark-card/50 scrollbar-thin">
                                                                        <code class="text-sm font-mono text-light-text dark:text-dark-text">
                                                                            {whitelistIPs.length > 0 
                                                                                ? whitelistIPs.join(', ')
                                                                                : 'No IP whitelist configured. Please contact administrator.'}
                                                                        </code>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        class="ml-1.5 p-1 rounded text-blue-500 hover:bg-blue-500/10 transition-colors"
                                                                        on:click={copyAllIPs}
                                                                    >
                                                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <!-- Step 3: Permissions -->
                                                            <div class="space-y-1.5">
                                                                <p class="text-sm font-medium text-light-text dark:text-dark-text">3. Enable Required Permissions</p>
                                                                <ul class="text-sm text-light-text-muted dark:text-dark-text-muted space-y-1 ml-3 list-disc">
                                                                    <li>Enable Reading permission</li>
                                                                    <li>Enable Futures permission</li>
                                                                    <li>Disable Withdrawal permission</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- API Key Input Fields -->
                                                <div class="space-y-1.5">
                                                    <label class="block text-sm font-medium text-light-text dark:text-dark-text">
                                                        API Key *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        bind:value={apiKey}
                                                        required
                                                        placeholder="Enter your API key"
                                                        class="w-full px-3 py-2 bg-light-background dark:bg-dark-background 
                                                               border border-light-border dark:border-dark-border 
                                                               rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent
                                                               text-light-text dark:text-dark-text placeholder-light-text-muted 
                                                               dark:placeholder-dark-text-muted"
                                                    />
                                                </div>

                                                <div class="space-y-1.5">
                                                    <label class="block text-sm font-medium text-light-text dark:text-dark-text">
                                                        Secret Key *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        bind:value={secretKey}
                                                        required
                                                        placeholder="Enter your Secret key"
                                                        class="w-full px-3 py-2 bg-light-background dark:bg-dark-background 
                                                               border border-light-border dark:border-dark-border 
                                                               rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent
                                                               text-light-text dark:text-dark-text placeholder-light-text-muted 
                                                               dark:placeholder-dark-text-muted"
                                                    />
                                                </div>

                                                <!-- Confirmation Checkbox -->
                                                <label class="flex items-start gap-2 p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 transition-colors cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        class="mt-0.5 w-4 h-4 rounded border-light-border dark:border-dark-border text-theme-500 focus:ring-theme-500"
                                                        bind:checked={ipWhitelistConfirmed}
                                                    >
                                                    <span class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                                        I confirm that I have completed all the configuration steps above
                                                    </span>
                                                </label>
                                            {:else if ['MT4', 'MT5'].includes(accountType)}
                                                <Input
                                                    label="Server"
                                                    bind:value={server}
                                                    type="text"
                                                    placeholder="Enter your broker's server address"
                                                    required
                                                />
                                                <Input
                                                    label="Login"
                                                    bind:value={login}
                                                    type="text"
                                                    placeholder="Enter your account login"
                                                    required
                                                />
                                                <Input
                                                    label="Password"
                                                    type="password"
                                                    bind:value={password}
                                                    placeholder="Enter your account password"
                                                    required
                                                />
                                                
                                                <!-- MT4/MT5 Instructions -->
                                                <div class="mt-6 p-4 bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl border border-light-border/10 dark:border-dark-border/10">
                                                    <div class="flex items-start gap-3">
                                                        <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                                        </svg>
                                                        <div class="space-y-2">
                                                            <p class="text-sm text-light-text dark:text-dark-text font-medium">
                                                                Connection Information
                                                            </p>
                                                            <ul class="text-sm text-light-text-muted dark:text-dark-text-muted space-y-1">
                                                                <li>• Use your broker's server address</li>
                                                                <li>• Enter your account login credentials</li>
                                                                <li>• Data is used for read-only purposes</li>
                                                            </ul>
                                                            <div class="pt-2">
                                                                <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                                                    Contact your broker for server details if needed
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}

                        <!-- Footer -->
                <div class="p-4 border-t border-light-border/10 dark:border-dark-border/10 bg-light-card dark:bg-dark-card">
                    <div class="flex justify-between gap-3">
                        {#if step === 1}
                            <Button 
                                variant="secondary" 
                                type="button"
                                size="sm"
                                class="flex-1"
                                on:click={handleClose}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary"
                                type="button"
                                size="sm"
                                class="flex-1"
                                disabled={!accountType}
                                on:click={() => step = 2}
                            >
                                Next
                            </Button>
                        {:else}
                            <Button 
                                variant="secondary"
                                type="button"
                                size="sm"
                                class="flex-1 flex items-center justify-center gap-2"
                                on:click={() => step = 1}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                                </svg>
                                Back
                            </Button>
                            <Button 
                                variant="primary"
                                type="submit"
                                size="sm"
                                class="flex-1"
                                {loading}
                                disabled={accountType === 'BINANCE_FUTURES' && !ipWhitelistConfirmed}
                            >
                                {#if loading}
                                    Connecting...
                                {:else}
                                    {accountType === 'MANUAL' ? 'Create Account' : 'Connect'}
                                {/if}
                            </Button>
                        {/if}
                        </div>
                </div>
            </form>
        </div>
    </div>
</Modal>

<style lang="postcss">
    :global(.modal-content) {
        @apply bg-transparent border-0 shadow-none;
        width: 100%;
        max-width: min(95vw, 64rem);
        margin: 2rem auto;
    }

    /* Add animation classes */
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }

    /* เพิ่ม custom scrollbar styles */
    .scrollbar-thin {
        scrollbar-width: thin;
    }
    
    .scrollbar-thin::-webkit-scrollbar {
        height: 6px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb, rgba(0, 0, 0, 0.2));
        border-radius: 3px;
    }
    
    .dark .scrollbar-thin::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb, rgba(255, 255, 255, 0.2));
    }
</style>
