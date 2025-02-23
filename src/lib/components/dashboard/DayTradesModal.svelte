<script>
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import TradeTable from "../trades/TradeTable.svelte";
    import TransactionTable from "../transactions/TransactionTable.svelte";
    import TransactionModal from "../transactions/TransactionModal.svelte";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { accountStore } from '$lib/stores/accountStore';
    import Loading from "$lib/components/common/Loading.svelte";
    import { transactionDate } from '$lib/stores/transactionDateStore';
    import { tradeDate } from '$lib/stores/tradeDateStore';
    import Modal from '../common/Modal.svelte';
    import { api } from '$lib/utils/api';
    import TradeViewModal from "$lib/components/trades/TradeViewModal.svelte";
    import TradeModal from "$lib/components/trades/TradeModal.svelte";
    import { dailyBalancesStore } from '$lib/stores/dailyBalancesStore';
    import { onMount, onDestroy } from "svelte";
    import { dayConfigStore } from '$lib/stores/dayConfigStore';
    import DayConfigModal from './DayConfigModal.svelte';
    import { dayTagStore } from '$lib/stores/dayTagStore';
    import DayTagHistoryModal from './DayTagHistoryModal.svelte';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trades = [];
    export let transactions = [];
    export let date = "";
    export let displayDate = "";
    export let accountId;
    export let loading = false;

    let showTransactionModal = false;
    let selectedTransaction = null;
    let error = null;

    let showDepositModal = false;
    let showWithdrawModal = false;

    let showDeleteConfirmModal = false;
    let deleteContext = null;

    let showViewModal = false;
    let showEditModal = false;
    let selectedTrade = null;

    let totalUnrealizedPnL = null;
    let isLoadingUnrealizedPnL = true;

    let dayConfig = null;
    let showDayConfigModal = false;

    // เพิ่ม state สำหรับเก็บ total amount ของ open trades
    let totalOpenAmount = 0;

    let showTagHistoryModal = false;
    let selectedTag = null;
    let selectedTagColor = null;

    $: if (show && accountId && date) {
        // Reset dayConfig เมื่อเปลี่ยนวัน
        dayConfig = null;
        loadDayConfig();
    }

    $: if (show && accountId) {
        resetUnrealizedPnL();
        loadTransactions();
        loadTrades();
    }

    $: dailyBalance = $dailyBalancesStore[date] || null;

    async function loadTrades() {
        try {
            const response = await api.getTrades(accountId);
            // Filter trades by date more precisely
            const filteredTrades = response.filter(trade => {
                const tradeDate = trade.status === "CLOSED" 
                    ? new Date(trade.exitDate) 
                    : new Date(trade.entryDate);
                
                // Convert both dates to local date string for comparison
                const tradeLocalDate = tradeDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
                return tradeLocalDate === date;
            });
            
            trades = filteredTrades;
        } catch (error) {
            console.error('Error loading trades:', error);
        }
    }

    async function loadDayConfig() {
        try {
            dayConfig = await dayConfigStore.loadConfig(accountId, date);
        } catch (error) {
            console.error('Error loading day config:', error);
        }
    }

    function handleNewTrade() {
        const formattedDate = new Date(date);
        formattedDate.setHours(7, 0, 0, 0);
        tradeDate.set(formattedDate.toISOString());
        selectedTrade = null;
        showEditModal = true;
    }

    function filterTransactionsByDate(transactionList, date) {
        if (!Array.isArray(transactionList)) {
            console.error('transactionList is not an array:', transactionList);
            return [];
        
        }
        return transactionList.filter(transaction => {
            const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
            return transactionDate === date;
        });
    }

    function close() {
        dispatch('close');
    }

    function formatDate(dateStr) {
        const options = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        };
        return new Date(dateStr).toLocaleString(undefined, options);
    }

    function handleEditTransaction(event) {
        selectedTransaction = event.detail;
        showTransactionModal = true;
    }

    function handleTransactionSubmit(event) {
        dispatch("editTransaction", event.detail);
        showTransactionModal = false;
    }

    function handleEdit(trade) {
        dispatch("edit", trade);
    }

    function handleDeposit() {
        showDepositModal = true;
    }

    function handleWithdraw() {
        showWithdrawModal = true;
    }

    function handleDeleteConfirm(event) {
        showDeleteConfirmModal = true;
        deleteContext = event.detail;
    }

    async function confirmDelete() {
        if (deleteContext) {
            try {
                await handleDelete(deleteContext);
            } catch (err) {
                console.error('Error in confirmDelete:', err);
            }
        }
        showDeleteConfirmModal = false;
        deleteContext = null;
    }

    async function handleDelete(event) {
        const { type, items, context } = event.detail;
        try {
            if (context === 'trades') {
                for (const tradeId of items) {
                    const result = await api.deleteTrade(tradeId);
                    if (!result.success) {
                        console.error(`Failed to delete trade ${tradeId}:`, result.error);
                        continue;
                    }
                }
                await loadTrades();
                dispatch('refresh');
            } else if (context === 'transactions') {
                for (const transactionId of items) {
                    try {
                        await api.deleteTransaction(transactionId);
                    } catch (err) {
                        console.error(`Failed to delete transaction ${transactionId}:`, err);
                        continue;
                    }
                }
                await loadTransactions();
            }
        } catch (err) {
            console.error('Error deleting items:', err);
        }
    }

    $: dailySummary = {
        totalPnL: trades.reduce((sum, trade) => sum + (trade.status === "CLOSED" ? (trade.pnl || 0) : 0), 0),
        winCount: trades.filter(t => t.status === "CLOSED" && t.pnl > 0).length,
        lossCount: trades.filter(t => t.status === "CLOSED" && t.pnl < 0).length,
        totalDeposits: transactions.reduce((sum, t) => sum + (t.type === "deposit" ? t.amount : 0), 0),
        totalWithdrawals: transactions.reduce((sum, t) => sum + (t.type === "withdrawal" ? t.amount : 0), 0),
        openTradesCount: trades.filter(t => t.status === "OPEN").length,
        closedTradesCount: trades.filter(t => t.status === "CLOSED").length,
    };

    $: winRate = dailySummary.winCount + dailySummary.lossCount > 0 
        ? ((dailySummary.winCount / (dailySummary.winCount + dailySummary.lossCount)) * 100).toFixed(1)
        : 0;

    function formatCurrency(value) {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
        
        // แปลงค่าเป็น number ก่อน format
        const numValue = Number(value);
        
        // ถ้าเป็นจำนวนเต็ม ให้แสดงทศนิยม 2 ตำแหน่ง
        if (Number.isInteger(numValue)) {
            return formatter.format(numValue.toFixed(2));
        }
        
        return formatter.format(numValue);
    }

    function handleTradeView(event) {
        selectedTrade = event.detail;
        showViewModal = true;
    }

    function handleTradeEdit(event) {
        selectedTrade = event.detail;
        showEditModal = true;
    }

    async function handleTradeFavorite(event) {
        try {
            await loadTrades();
        } catch (error) {
            console.error('Error updating favorite:', error);
        }
    }

    function closeViewModal() {
        showViewModal = false;
        selectedTrade = null;
    }

    function calculateDailyBalance() {
        if (!dailyBalance) return;

        const totalPnL = trades.reduce((sum, trade) => 
            sum + (trade.status === "CLOSED" ? (trade.pnl || 0) : 0), 0);

        const transactionChange = transactions.reduce((sum, t) => 
            sum + (t.type === "deposit" ? t.amount : -t.amount), 0);

        dailyBalancesStore.update(balances => {
            return {
                ...balances,
                [date]: {
                    ...dailyBalance,
                    endBalance: dailyBalance.startBalance + totalPnL + transactionChange
                }
            };
        });
    }

    $: {
        calculateDailyBalance();
    }

    async function handleTransactionUpdated() {
        await loadTransactions();
        calculateDailyBalance();
        showTransactionModal = false;
        selectedTransaction = null;
        dispatch('refresh');
    }

    async function handleTradeUpdated() {
        console.log('DayTradesModal: Trade updated, reloading trades...');
        await loadTrades();
        calculateDailyBalance();
        showEditModal = false;
        selectedTrade = null;
        console.log('DayTradesModal: Dispatching refresh event');
        dispatch('refresh');
    }

    function handleUnrealizedPnLUpdate(event) {
        const { total, isLoading } = event.detail;
        totalUnrealizedPnL = total;
        isLoadingUnrealizedPnL = isLoading;
        
        // คำนวณ total amount จาก open trades
        totalOpenAmount = trades
            .filter(t => t.status === "OPEN")
            .reduce((sum, trade) => sum + Math.abs(trade.amount || 0), 0);
    }

    // เพิ่มฟังก์ชัน loadTransactions
    async function loadTransactions() {
        try {
            const response = await api.getTransactions(accountId);
            
            // ตรวจสอบว่า response เป็น array หรือไม่
            const transactionsData = Array.isArray(response) 
                ? response 
                : response?.data || [];  // ถ้าไม่ใช่ array ให้ลองดึง data หรือใช้ array ว่าง
            
            // Filter transactions by date
            transactions = transactionsData.filter(transaction => {
                const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
                return transactionDate === date;
            });
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    // เพิ่มฟังก์ชัน calculateDailySummary
    function calculateDailySummary() {
        const summary = {
            totalPnL: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            winCount: 0,
            lossCount: 0
        };

        // Calculate trades summary
        trades.forEach(trade => {
            if (trade.status === 'CLOSED') {
                if (trade.pnl > 0) summary.winCount++;
                else if (trade.pnl < 0) summary.lossCount++;
                summary.totalPnL += trade.pnl;
            }
        });

        // Calculate transactions summary
        transactions.forEach(transaction => {
            if (transaction.type === 'DEPOSIT') {
                summary.totalDeposits += transaction.amount;
            } else if (transaction.type === 'WITHDRAW') {
                summary.totalWithdrawals += transaction.amount;
            }
        });

        return summary;
    }

    // Reactive declarations
    $: dailySummary = calculateDailySummary();
    $: winRate = trades.length > 0 
        ? Math.round((dailySummary.winCount / trades.filter(t => t.status === 'CLOSED').length) * 100) 
        : 0;

    // Watch for changes
    $: if (show && accountId) {
        loadTransactions();
        loadTrades();
    }

    function handleConfigEdit() {
        showDayConfigModal = true;
    }

    async function handleConfigUpdated(event) {
        const updatedConfig = event.detail;
        if (updatedConfig) {
            dayConfig = updatedConfig;
        }
        await loadDayConfig();
    }

    async function handleFavoriteToggle() {
        try {
            dayConfig = await dayConfigStore.toggleFavorite(accountId, date);
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }

    $: getTagColor = (tag) => {
        const colors = [
            { bg: 'bg-blue-500/10', text: 'text-blue-500' },
            { bg: 'bg-green-500/10', text: 'text-green-500' },
            { bg: 'bg-purple-500/10', text: 'text-purple-500' },
            { bg: 'bg-orange-500/10', text: 'text-orange-500' },
            { bg: 'bg-pink-500/10', text: 'text-pink-500' },
            { bg: 'bg-teal-500/10', text: 'text-teal-500' },
            { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
        ];
        
        const hash = tag.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    };

    // เพิ่มฟังก์ชัน resetUnrealizedPnL
    function resetUnrealizedPnL() {
        totalUnrealizedPnL = null;
        isLoadingUnrealizedPnL = true;
    }

    // เพิ่มฟังก์ชันสำหรับดึงจำนวนการใช้งานของ tag
    function getTagUsageCount(tagValue) {
        const tag = $dayTagStore.tags.find(t => t.value === tagValue);
        return tag ? tag.usageCount : 0;
    }

    function handleTagClick(tag, color) {
        selectedTag = tag;
        selectedTagColor = color;
        showTagHistoryModal = true;
    }

    async function handleDaySelect(event) {
        const day = event.detail;
        showTagHistoryModal = false;
        // รอให้ modal ปิดก่อนเปิด DayTradesModal ใหม่
        await tick();
        dispatch('openDay', day);
    }

    onMount(async () => {
        // ... existing onMount code ...
        await dayTagStore.loadTags(); // เพิ่มการโหลด tags
    });
</script>

{#if loading}
    <Loading message="Loading..." overlay={true} />
{:else if error}
    <div class="text-red-500">{error}</div>
{:else if show}
    <div class="fixed modal inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
         transition:fade={{ duration: 150 }}>
        <div class="card w-full max-w-4xl mx-auto relative transform ease-out max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-0 flex justify-between items-center bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <div class="flex items-center gap-4">
                    <!-- Favorite Star -->
                    <button
                        class="text-light-text-muted dark:text-dark-text-muted hover:text-yellow-500 transition-colors"
                        on:click={handleFavoriteToggle}
                        title={dayConfig?.favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                        <svg class="w-6 h-6" fill={dayConfig?.favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                        </svg>
                    </button>
                    <h2 class="text-xl font-bold text-light-text dark:text-dark-text">
                        {displayDate}
                    </h2>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-4 md:gap-1">
                        <Button variant="secondary" size="xs" on:click={handleDeposit}>
                            <svg class="w-5 h-5 md:w-3 md:h-3 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            <span class="hidden md:flex">Deposit</span>
                        </Button>
                        <Button variant="secondary" size="xs" on:click={handleWithdraw}>
                            <svg class="w-5 h-5 md:w-3 md:h-3 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                            </svg>
                            <span class="hidden md:flex">Withdraw</span>
                        </Button>
                        <Button variant="secondary" size="xs" on:click={handleConfigEdit}>
                            <svg class="w-5 h-5 md:w-3 md:h-3 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            <span class="hidden md:flex">Edit</span>
                        </Button>
                    </div>
                    <Button variant="primary" size="sm" on:click={handleNewTrade}>
                        <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        <span class="hidden md:flex">New Trade</span>
                    </Button>
                    <button class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                            on:click={close}>
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto">
                <!-- Summary Section -->
                <div class="px-8 py-4 border-b border-light-border dark:border-0 bg-light-hover/30 dark:bg-dark-hover/30">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        <!-- Balance Summary - Always show -->
                        <div class="space-y-1">
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">End of Day Balance</h4>
                            <p class="text-lg font-bold text-light-text dark:text-dark-text">
                                {#if dailyBalance}
                                    {formatCurrency(dailyBalance.endBalance)}
                                {:else}
                                    Loading...
                                {/if}
                            </p>
                        </div>

                        {#if trades.length > 0 || transactions.length > 0}
                            <!-- P&L Summary -->
                            <div class="space-y-1">
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Day P&L</h4>
                                    <p class="text-lg font-bold {dailySummary.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                                        {formatCurrency(dailySummary.totalPnL)}
                                        {#if dailyBalance?.startBalance && dailyBalance.startBalance !== 0}
                                            <span class="text-sm">
                                                ({((dailySummary.totalPnL / Math.abs(dailyBalance.startBalance)) * 100).toFixed(1)}%)
                                            </span>
                                        {/if}
                                    </p>
                                </div>
                            {#if trades.filter(t => t.status === "OPEN").length > 0}
                                <div class="space-y-1">
                                    <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                        Unrealized P&L
                                    </div>
                                    <div class="text-lg font-semibold">
                                        {#if isLoadingUnrealizedPnL || totalUnrealizedPnL === null}
                                            <span class="text-light-text-muted dark:text-dark-text-muted">
                                                Loading...
                                            </span>
                                        {:else}
                                            <span class={totalUnrealizedPnL > 0 ? 'text-green-500' : totalUnrealizedPnL < 0 ? 'text-red-500' : 'text-light-text dark:text-dark-text'}>
                                                {formatCurrency(totalUnrealizedPnL)}
                                                {#if totalOpenAmount > 0}
                                                    <span class="text-sm">
                                                        ({((totalUnrealizedPnL / totalOpenAmount) * 100).toFixed(2)}%)
                                                    </span>
                                                {/if}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/if}

                            <!-- Transactions Summary - Only show if there are transactions -->
                            {#if transactions.length > 0}
                                <div class="space-y-1">
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Transactions</h4>
                                    <div class="flex flex-col">
                                        {#if dailySummary.totalDeposits > 0}
                                            <span class="text-sm text-green-500">+{formatCurrency(dailySummary.totalDeposits)}</span>
                                        {/if}
                                        {#if dailySummary.totalWithdrawals > 0}
                                            <span class="text-sm text-red-500">-{formatCurrency(dailySummary.totalWithdrawals)}</span>
                                        {/if}
                                    </div>
                                </div>
                            {/if}

                            <!-- Trade Stats - Only show if there are trades -->
                            {#if trades.length > 0}
                                <div class="space-y-1">
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Trade Stats</h4>
                                    <div class="flex gap-3 flex-col md:flex-row ">

                                        <div class="flex flex-wrap gap-2">
                                            <div class="flex items-center gap-1">
                                                <span class="text-sm font-bold text-green-500">{dailySummary.winCount}</span>
                                                <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Win</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span class="text-sm font-bold text-red-500">{dailySummary.lossCount}</span>
                                                <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Loss</span>
                                            </div>
                                            {#if dailySummary.openTradesCount > 0}
                                                <div class="flex items-center gap-1">
                                                    <span class="text-sm font-bold text-yellow-500">{dailySummary.openTradesCount}</span>
                                                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Open</span>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/if}
                            
                        {/if}
                    </div>
                    <div class="flex justify-between items-end gap-4">
                <!-- Add the note section after the summary section and before the tables -->
                {#if dayConfig?.note}
                    <div class="w-full py-4 border-b border-light-border dark:border-0">
                        <div class="flex items-center gap-2 mb-2">
                            <svg class="w-4 h-4 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Notes</h3>
                        </div>
                        <div class="prose prose-sm max-w-none text-light-text dark:text-dark-text">
                            {dayConfig.note}
                        </div>
                    </div>
                {/if}

                <!-- Add the tags section at the bottom of the modal -->
                {#if dayConfig?.tags?.length > 0}
                    <div class="px-8 py-4 mt-4 border-t border-light-border dark:border-0">
                        <div class="flex gap-2">
                            {#each dayConfig.tags as tag}
                                {@const tagColor = getTagColor(tag)}
                                <div 
                                    class="flex items-center gap-1 px-2 py-1 rounded-full {tagColor.bg} {tagColor.text} text-sm cursor-pointer hover:opacity-80"
                                    on:click={() => handleTagClick(tag, tagColor)}
                                >
                                    <span>{tag}</span>
                                    <span class="ml-1 text-xs opacity-75">
                                        ({getTagUsageCount(tag)})
                                    </span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
                    </div>
                </div>



                <!-- Tables Content -->
                <div class="px-8 py-6">
                    {#if trades.length === 0 && (!transactions || transactions.length === 0)}
                        <!-- Empty State -->
                        <div class="text-center py-8">
                            <svg on:click={handleNewTrade} 
                                 class="w-16 h-16 mx-auto mb-4 text-light-text-muted dark:text-dark-text-muted cursor-pointer" 
                                 fill="none" 
                                 stroke="currentColor" 
                                 viewBox="0 0 24 24">
                                <path stroke-linecap="round" 
                                      stroke-linejoin="round" 
                                      stroke-width="2" 
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                            <p class="text-light-text-muted dark:text-dark-text-muted">
                                No trades recorded for this day. Would you like to add one?
                            </p>
                        </div>
                    {:else}
                        <!-- Tables -->
                        {#if trades.filter(t => t.status === "OPEN").length > 0}
                            <div class="mb-6">
                                <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                    Open Trades
                                </h3>
                                <TradeTable
                                    trades={trades.filter(t => t.status === "OPEN")}
                                    type="open"
                                    isInModal={true}
                                    on:view={handleTradeView}
                                    on:edit={handleTradeEdit}
                                    on:favorite={handleTradeFavorite}
                                    on:disable
                                    on:delete={handleDelete}
                                    on:deleted={() => dispatch('refresh')}
                                    on:unrealizedPnLUpdate={handleUnrealizedPnLUpdate}
                                />
                            </div>
                        {/if}

                        {#if trades.filter(t => t.status === "CLOSED").length > 0}
                            <div class="mb-6">
                                <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                    Closed Trades
                                </h3>
                                <TradeTable
                                    trades={trades.filter(t => t.status === "CLOSED")}
                                    type="closed"
                                    isInModal={true}
                                    dailyBalance={dailyBalance}
                                    on:view={handleTradeView}
                                    on:edit={handleTradeEdit}
                                    on:favorite={handleTradeFavorite}
                                    on:disable
                                    on:delete={handleDelete}
                                    on:deleted={() => dispatch('refresh')}
                                />
                            </div>
                        {/if}

                        {#if transactions && transactions.length > 0}
                            <div class="">
                                <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                    Transactions
                                </h3>
                                <TransactionTable
                                    {accountId}
                                    {transactions}
                                    isInModal={true}
                                    readOnly={false}
                                    hideEmptyState={true}
                                    on:edit={handleEditTransaction}
                                    on:delete={handleDelete}
                                    on:deleted={loadTransactions}
                                />
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Transaction Modals -->
<TransactionModal
    show={showTransactionModal || showDepositModal || showWithdrawModal}
    transaction={selectedTransaction}
    {accountId}
    type={showDepositModal ? 'deposit' : showWithdrawModal ? 'withdraw' : selectedTransaction?.type || 'deposit'}
    initialDate={date ? new Date(date) : null}
    on:close={() => {
        showTransactionModal = false;
        showDepositModal = false;
        showWithdrawModal = false;
        selectedTransaction = null;
    }}
    on:transactionUpdated={handleTransactionUpdated}
/>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmModal}
    <Modal
        show={showDeleteConfirmModal}
        title="Confirm Delete"
        on:close={() => showDeleteConfirmModal = false}
    >
        <div class="p-6">
            <p class="text-light-text dark:text-dark-text">
                {#if deleteContext?.type === 'selected'}
                    Are you sure you want to delete {deleteContext.items.length} selected trades?
                {:else if deleteContext?.type === 'single'}
                    Are you sure you want to delete this trade?
                {:else}
                    Are you sure you want to delete all trades?
                {/if}
            </p>
            <div class="flex justify-end gap-4 mt-6">
                <Button
                    variant="secondary"
                    size="sm"
                    on:click={() => showDeleteConfirmModal = false}
                >
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    on:click={confirmDelete}
                >
                    Delete
                </Button>
            </div>
        </div>
    </Modal>
{/if}

<!-- เพิ่ม Modals -->
{#if selectedTrade}
    <TradeViewModal
        bind:show={showViewModal}
        trade={selectedTrade}
        on:close={closeViewModal}
    />
{/if}

<TradeModal
    bind:show={showEditModal}
    trade={selectedTrade}
    accountId={accountId}
    on:tradeUpdated={async () => {
        await loadTrades();
        showEditModal = false;
        selectedTrade = null;
        dispatch('refresh');
    }}
/>

<DayConfigModal
    bind:show={showDayConfigModal}
    {accountId}
    {date}
    config={dayConfig}
    on:configUpdated={handleConfigUpdated}
/>

<DayTagHistoryModal
    bind:show={showTagHistoryModal}
    tag={selectedTag}
    tagColor={selectedTagColor}
    on:selectDay={handleDaySelect}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }

    /* Add these styles if needed */
    :global(.modal) {
        overscroll-behavior: contain;
    }

    /* เพิ่ม style สำหรับ tag count */
    :global(.tag-count) {
        @apply ml-1.5 px-1.5 py-0.5 text-xs rounded-full 
        bg-light-hover/50 dark:bg-dark-hover/50
        text-light-text-muted dark:text-dark-text-muted;
    }
</style>
