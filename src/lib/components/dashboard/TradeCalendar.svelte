<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { theme } from "$lib/stores/themeStore";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { binanceExchange } from '$lib/exchanges';
    import DayTradesModal from "./DayTradesModal.svelte";
    import Select from "../common/Select.svelte";
    import DatePicker from '../common/DatePicker.svelte';
    import { api } from '$lib/utils/api';
    import { dailyBalancesStore } from '$lib/stores/dailyBalancesStore';
    import { fade } from 'svelte/transition';

    const dispatch = createEventDispatcher();

    export let trades = [];
    export let isPreview = false;
    let showDayTradesModal = false;
    let selectedDayTrades = [];
    let selectedDayTransactions = [];
    let selectedDate = "";
    let selectedDisplayDate = "";
    let dayTradesLoading = false;
    let showMonthYearPicker = false;
    let showDatePicker = false;
    let currentAccountId = null;
    let dailyTrades = {};
    let dailyBalances = {};
    let selectedDayBalance = null;

    // Add state for current prices and loading state
    let currentPrices = new Map();
    let binanceWs;
    let isLoadingPrices = true;

    // เพิ่ม reactive statement สำหรับ monthly stats โดยให้ track dailyBalances ด้วย
    $: monthlyStats = calculateMonthlyStats(statsPerDay, dailyBalances);

    // ทำให้ monthlyStats update เมื่อ selectedMonth หรือ selectedYear หรือ dailyBalances เปลี่ยน
    $: {
        if (selectedMonth !== undefined && selectedYear !== undefined && dailyBalances) {
            monthlyStats = calculateMonthlyStats(statsPerDay, dailyBalances);
        }
    }

    // Add reactive statement for statsPerDay
    $: statsPerDay = {};
    $: {
        calendarDays.forEach(day => {
            if (day !== null) {
                statsPerDay[day] = getDayStats(day);
            }
        });
    }

    // Make statsPerDay reactive to currentPrices changes
    $: {
        if (currentPrices) {
            statsPerDay = { ...statsPerDay };
        }
    }

    async function loadData() {
        if (isPreview) return;
        
        try {
            dayTradesLoading = true;
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
            trades = await api.getTrades($accountStore.currentAccount._id);
            
            // Force recalculation of reactive statements
            trades = [...trades];
            
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            dayTradesLoading = false;
        }
    }

    onMount(async () => {
        await loadData();
        
        // Add event listeners for trade updates
        const handleTradeUpdate = async () => {
            // console.log('TradeCalendar: Received trade update event');
            await loadData();
        };
        
        // เพิ่ม event listeners ทั้งหมดที่เกี่ยวข้อง
        window.addEventListener('tradeupdate', handleTradeUpdate);
        window.addEventListener('tradeupdated', handleTradeUpdate);
        window.addEventListener('tradesynced', handleTradeUpdate);
        
        // Cleanup listeners on component destroy
        return () => {
            window.removeEventListener('tradeupdate', handleTradeUpdate);
            window.removeEventListener('tradeupdated', handleTradeUpdate);
            window.removeEventListener('tradesynced', handleTradeUpdate);
        };
    });

    // แก้ไข reactive statement สำหรับ account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId && !isPreview) {
        currentAccountId = $accountStore.currentAccount?._id;
        if (currentAccountId) {
            selectedMonth = new Date().getMonth();
            selectedYear = new Date().getFullYear();
            loadData(); // เรียก loadData เฉพาะเมื่อเปลี่ยน account
        }
    }

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);

    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();

    // Helper function to normalize date to noon
    function normalizeDate(date) {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    let calendarDays = [];

    // Combine all calculations into one reactive block
    $: {
        // สร้าง object ใหม่
        const newDailyTrades = {};
        
        // Process trades first
        trades.forEach(trade => {
            let tradeDate;
            if (trade.status === "CLOSED") {
                tradeDate = new Date(trade.exitDate);
            } else {
                tradeDate = new Date(trade.entryDate);
            }

            try {
                if (isNaN(tradeDate.getTime())) return;

                const dateKey = normalizeDate(tradeDate).toISOString().split("T")[0];
                if (!newDailyTrades[dateKey]) {
                    newDailyTrades[dateKey] = {
                        trades: [],
                        pnl: 0,
                        symbols: new Set(),
                        wins: 0,
                        losses: 0,
                        openTrades: 0,
                        transactions: [],
                        startBalance: $dailyBalancesStore[dateKey]?.startBalance || 0,
                    };
                }

                newDailyTrades[dateKey].trades.push(trade);
                if (trade.status === "CLOSED") {
                    newDailyTrades[dateKey].pnl += trade.pnl || 0;
                    if (trade.pnl > 0) newDailyTrades[dateKey].wins++;
                    else if (trade.pnl < 0) newDailyTrades[dateKey].losses++;
                } else {
                    newDailyTrades[dateKey].openTrades++;
                    // Calculate unrealized P&L for open trades
                    const currentPrice = currentPrices.get(trade.symbol);
                    if (currentPrice) {
                        const unrealizedPnL = binanceExchange.calculateUnrealizedPnL(trade, currentPrice);
                        newDailyTrades[dateKey].unrealizedPnl = (newDailyTrades[dateKey].unrealizedPnl || 0) + (unrealizedPnL || 0);
                    }
                }
            } catch (err) {
                console.error("Error processing trade date:", err);
            }
        });

        // Process transactions
        if (Array.isArray($transactionStore.transactions)) {
            $transactionStore.transactions.forEach((transaction) => {
                const transDate = normalizeDate(transaction.date);
                const dateKey = transDate.toISOString().split("T")[0];

                if (!newDailyTrades[dateKey]) {
                    newDailyTrades[dateKey] = {
                        trades: [],
                        pnl: 0,
                        symbols: new Set(),
                        wins: 0,
                        losses: 0,
                        openTrades: 0,
                        transactions: [],
                        startBalance: $dailyBalancesStore[dateKey]?.startBalance || 0,
                    };
                }

                newDailyTrades[dateKey].transactions.push({
                    ...transaction,
                    date: transDate.toISOString(),
                });
            });
        }

        // Update dailyTrades
        dailyTrades = newDailyTrades;

        // 2. Then calculate calendar days
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const firstDayOfWeek = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7;

        calendarDays = Array.from(
            { length: 42 },
            (_, i) => {
                const dayNumber = i - firstDayOfWeek + 1;
                if (dayNumber < 1 || dayNumber > daysInMonth) return null;
                return dayNumber;
            }
        );

        // 3. Finally calculate statsPerDay
        statsPerDay = {};
        calendarDays.forEach(day => {
            if (day !== null) {
                statsPerDay[day] = getDayStats(day);
            }
        });
    }

    // Calculate pnlPercentage for each day's stats
    $: {
        for (const dateKey in dailyTrades) {
            const stats = dailyTrades[dateKey];
            const balance = dailyBalances[dateKey];
            if (balance && balance !== 0) {
                // ปรับการคำนวณ percentage
                const pnlValue = stats.pnl || 0;
                const percentage = (pnlValue / Math.abs(balance)) * 100;
                stats.pnlPercentage = percentage;
            } else {
                stats.pnlPercentage = null;
            }
        }
    }

    // Compute daily balances based on transactions and trades
    $: {
        dailyBalances = {};
        
        // หา balance สุดท้ายของเดือนก่อนหน้า
        const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0);
        const prevMonthLastDayKey = formatDateForInput(prevMonthLastDay);
        
        // เริ่มต้นด้วย initial balance หรือ balance สุดท้ายของเดือนก่อนหน้า
        let cumulativeBalance = $accountStore.currentAccount?.initialBalance || 0;
        
        // หา balance ทั้งหมดก่อนเดือนที่เลือก
        const allDatesBeforeMonth = [...new Set([
            ...trades.map(t => normalizeDate(t.status === "CLOSED" ? t.exitDate : t.entryDate).toISOString().split('T')[0]),
            ...$transactionStore.transactions.map(t => normalizeDate(t.date).toISOString().split('T')[0])
        ])].sort().filter(date => date < formatDateForInput(new Date(selectedYear, selectedMonth, 1)));

        // คำนวณ balance สะสมจนถึงวันสุดท้ายของเดือนก่อนหน้า
        allDatesBeforeMonth.forEach(dateKey => {
            const dayTransactions = $transactionStore.transactions.filter(t => 
                normalizeDate(t.date).toISOString().split('T')[0] === dateKey
            );

            const dayTrades = trades.filter(t => 
                t.status === "CLOSED" && 
                normalizeDate(t.exitDate).toISOString().split('T')[0] === dateKey
            );

            const transactionChange = dayTransactions.reduce((sum, t) => 
                sum + (t.type === "deposit" ? t.amount : -t.amount), 0
            );
            
            const tradeChange = dayTrades.reduce((sum, t) => 
                sum + (Number(t.pnl) || 0), 0
            );

            cumulativeBalance += transactionChange + tradeChange;
        });

        // คำนวณ balance สำหรับเดือนปัจจุบัน
        const currentMonthDates = [...new Set([
            ...trades.map(t => normalizeDate(t.status === "CLOSED" ? t.exitDate : t.entryDate).toISOString().split('T')[0]),
            ...$transactionStore.transactions.map(t => normalizeDate(t.date).toISOString().split('T')[0])
        ])].sort().filter(date => {
            const currentDate = new Date(date);
            return currentDate.getMonth() === selectedMonth && currentDate.getFullYear() === selectedYear;
        });

        // Fill in all days of the current month
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(selectedYear, selectedMonth, day);
            const dateKey = formatDateForInput(currentDate);
            
            const dayTransactions = $transactionStore.transactions.filter(t => 
                normalizeDate(t.date).toISOString().split('T')[0] === dateKey
            );

            const dayTrades = trades.filter(t => 
                t.status === "CLOSED" && 
                normalizeDate(t.exitDate).toISOString().split('T')[0] === dateKey
            );

            const transactionChange = dayTransactions.reduce((sum, t) => 
                sum + (t.type === "deposit" ? t.amount : -t.amount), 0
            );
            
            const tradeChange = dayTrades.reduce((sum, t) => 
                sum + (Number(t.pnl) || 0), 0
            );

            dailyBalances[dateKey] = {
                startBalance: cumulativeBalance,
                endBalance: cumulativeBalance + transactionChange + tradeChange,
                transactions: dayTransactions,
                trades: dayTrades,
                hasActivity: dayTransactions.length > 0 || dayTrades.length > 0
            };

            cumulativeBalance += transactionChange + tradeChange;
        }

        // Update dailyBalancesStore
        dailyBalancesStore.set(dailyBalances);
    }

    function getDayStats(day) {
        if (!day) return null;
        try {
            const date = normalizeDate(
                new Date(selectedYear, selectedMonth, day)
            );
            if (isNaN(date.getTime())) return null;

            const dateKey = date.toISOString().split("T")[0];
            const stats = dailyTrades[dateKey] || {
                trades: [],
                pnl: 0,
                symbols: new Set(),
                wins: 0,
                losses: 0,
                openTrades: 0,
                transactions: [],
                startBalance: $dailyBalancesStore[dateKey]?.startBalance || 0,
            };

            // Calculate unrealized P&L for open trades
            if (stats.trades.length > 0) {
                const openTrades = stats.trades.filter(t => t.status === "OPEN");
                stats.openTrades = openTrades.length;
                stats.unrealizedPnl = openTrades.reduce((sum, trade) => {
                    const currentPrice = currentPrices.get(trade.symbol);
                    if (!currentPrice) return sum;
                    const unrealizedPnL = binanceExchange.calculateUnrealizedPnL(trade, currentPrice);
                    return sum + (unrealizedPnL || 0);
                }, 0);
            }

            return stats;
        } catch (err) {
            console.error("Error getting day stats:", err);
            return null;
        }
    }

    function isFutureDate(day) {
        const date = normalizeDate(new Date(selectedYear, selectedMonth, day));
        const today = normalizeDate(new Date());
        return date > today;
    }

    function formatDateForInput(date) {
        const d = normalizeDate(date);
        return d.toISOString().slice(0, 10);
    }

    function getCardClass(stats, day) {
        let baseClasses = "";
        
        if (isFutureDate(day)) {
            baseClasses = "opacity-50 bg-light-hover/20 dark:bg-dark-hover/20 sweet:bg-sweet-hover/20";
        } else if (!stats || (!stats.pnl && !stats.openTrades && !stats.transactions?.length)) {
            baseClasses = "cursor-pointer rounded-md bg-light-hover/10 dark:bg-dark-hover/10 sweet:bg-sweet-hover/10";
        } else {
            // Check for closed trades first
            const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
            if (hasClosedTrades) {
                if (stats.pnl > 0) {
                    baseClasses = "cursor-pointer rounded-md bg-green-100 border border-green-300/30 dark:border-0 dark:bg-green-900/20 sweet:border-0 sweet:bg-sweet-success/10";
                } else {
                    baseClasses = "cursor-pointer rounded-md bg-red-100 border border-red-300/30 dark:border-0 dark:bg-red-900/20 sweet:border-0 sweet:bg-sweet-danger/10";
                }
            } else if (stats.openTrades > 0 || stats.transactions?.length > 0) {
                baseClasses = "cursor-pointer rounded-md bg-yellow-50 border border-yellow-300/30 dark:border-0 dark:bg-yellow-900/10 sweet:border-0 sweet:bg-yellow-400/10";
            } else {
                baseClasses = "cursor-pointer rounded-md";
            }
        }

        // Add today card styles if it's today
        if (isToday(day)) {
            baseClasses += " relative bg-indigo-50/10 dark:bg-indigo-900/10 sweet:bg-sweet-primary/5" +
                " before:content-[''] before:absolute before:inset-[-2px]" +
                " before:z-[1] before:rounded-lg before:p-[2px]" +
                " before:bg-gradient-to-r before:from-purple-400 before:via-blue-400 before:to-indigo-400" +
                " before:sweet:from-sweet-primary before:sweet:via-sweet-secondary before:sweet:to-sweet-accent" +
                " before:animate-border-dance before:pointer-events-none" +
                " before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]" +
                " before:[mask-composite:exclude]";
        }

        return baseClasses;
    }

    function getTextClass(stats) {
        if (
            !stats ||
            (!stats.pnl && !stats.openTrades && !stats.transactions?.length)
        )
            return "";

        // Check for closed trades first
        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            if ($theme === "dark") {
                return stats.pnl > 0 ? "text-green-300" : "text-red-300";
            } else if ($theme === "sweet") {
                return stats.pnl > 0 ? "text-sweet-success" : "text-sweet-danger";
            }
            return stats.pnl > 0 ? "text-green-600" : "text-red-600";
        }

        // If no closed trades but has open trades or transactions
        if (stats.openTrades > 0 || stats.transactions?.length > 0) {
            if ($theme === "dark") {
                return "text-yellow-300";
            } else if ($theme === "sweet") {
                return "text-yellow-500";
            }
            return "text-yellow-600";
        }

        return "";
    }

    function formatPnL(value) {
        if (!value) return '$0';
        const prefix = value >= 0 ? '+$' : '-$';
        return `${prefix}${Math.abs(value).toFixed(2)}`;
    }

    function formatPnLWithPercentage(stats) {
        if (!stats || !stats.pnl) return "";
        
        const pnlStr = formatPnL(stats.pnl);
        if (!stats.startBalance || stats.startBalance === 0) return pnlStr;

        const percentage = ((stats.pnl / Math.abs(stats.startBalance)) * 100).toFixed(1);
        return `${pnlStr} (${percentage}%)`;
    }

    function handleDayClick(day, stats) {
        if (isFutureDate(day)) return;

        const date = normalizeDate(new Date(selectedYear, selectedMonth, day));
        const formattedDate = formatDateForInput(date);
        const displayDate = date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        selectedDate = formattedDate;
        selectedDisplayDate = displayDate;
        selectedDayTrades = stats?.trades || [];
        selectedDayTransactions = stats?.transactions || [];
        selectedDayBalance = dailyBalances[formattedDate];
        
        // console.log('TradeCalendar: Opening day modal with date:', formattedDate);
        showDayTradesModal = true;
    }

    function handleView(event) {
        dispatch('view', event.detail);
    }

    function handleEdit(event) {
        // console.log('TradeCalendar: Handling edit event');
        dispatch('edit', event.detail);
        loadData();
    }

    function handleDelete(event) {
        // console.log('TradeCalendar: Handling delete event');
        dispatch('delete', event.detail);
        loadData();
    }

    function handleDeleteTransaction(event) {
        // console.log('TradeCalendar: Handling delete transaction event');
        dispatch('deleteTransaction', event.detail);
        loadData();
    }

    function handleNewTrade(event) {
        // console.log('TradeCalendar: Handling new trade event');
        dispatch('newTrade');
        loadData();
    }

    // แก้ไขฟังก์ชัน previousMonth และ nextMonth ให้ไม่ต้องเรียก loadData
    async function previousMonth() {
        if (selectedMonth === 0) {
            selectedMonth = 11;
            selectedYear--;
        } else {
            selectedMonth--;
        }
        await loadDailyBalances();
    }

    async function nextMonth() {
        if (selectedMonth === 11) {
            selectedMonth = 0;
            selectedYear++;
        } else {
            selectedMonth++;
        }
        await loadDailyBalances();
    }

    async function loadDailyBalances() {
        if (!$accountStore.currentAccount) return;
        try {
            // แทนที่จะเรียก fetch ใหม่ทุกครั้ง ให้ใช้ dailyBalances ที่มีอยู่แล้ว 
            // ถ้ายังไม่มีข้อมูลเลยในครั้งแรกค่อย fetch
            if (Object.keys($dailyBalancesStore).length === 0) {
                await dailyBalancesStore.fetch($accountStore.currentAccount._id);
            }
            // ไม่จำเป็นต้อง fetch ทุกครั้งที่เปลี่ยนเดือน เพราะข้อมูลควรจะถูกโหลดครั้งเดียวตอนเริ่มต้นหรือเมื่อมีการอัพเดทเท่านั้น
        } catch (err) {
            console.error('Error loading daily balances:', err);
        }
    }

    function isToday(day) {
        const today = new Date();
        const date = new Date(selectedYear, selectedMonth, day);
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }

    // เพิ่มฟังก์ชันใหม่เพื่อคำนวณ stats จาก statsPerDay
    function calculateMonthlyStats(statsPerDay, dailyBalances) {
        let stats = {
            openTrades: 0,
            wins: 0,
            losses: 0,
            pnl: 0,
            volume: 0,
            monthlyPercentage: 0
        };

        // วนลูปผ่านทุกวันในเดือน
        Object.values(statsPerDay).forEach(dayStats => {
            if (!dayStats) return;
            
            stats.openTrades += dayStats.openTrades || 0;
            stats.wins += dayStats.wins || 0;
            stats.losses += dayStats.losses || 0;
            stats.pnl += dayStats.pnl || 0;
            stats.volume += dayStats.totalInvested || 0;
        });

        // คำนวณ ROI
        stats.roi = stats.volume > 0 ? ((stats.pnl / stats.volume) * 100).toFixed(1) : 0;

        // คำนวณ monthly percentage โดยไม่รวม transactions
        const monthStartDate = new Date(selectedYear, selectedMonth, 1);
        const today = new Date();
        const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
        const monthEndDate = isCurrentMonth ? today : new Date(selectedYear, selectedMonth + 1, 0);
        
        const startDateKey = formatDateForInput(monthStartDate);
        const endDateKey = formatDateForInput(monthEndDate);

        // ตรวจสอบว่ามี dailyBalances และมีข้อมูลของวันที่ต้องการ
        if (dailyBalances && dailyBalances[startDateKey]) {
            const startBalance = dailyBalances[startDateKey].startBalance;
            if (startBalance && startBalance !== 0) {
                // คำนวณ percentage โดยไม่รวม transactions
                const monthlyPnL = stats.pnl; // ใช้เฉพาะ P&L จาก trades
                stats.monthlyPercentage = ((monthlyPnL / Math.abs(startBalance)) * 100).toFixed(2);
            }
        }

        return stats;
    }

    // เพิ่มฟังก์ชันสำหรับหา end of month balance ของเดือนก่อนหน้า
    function getPreviousMonthEndBalance() {
        // หาวันสุดท้ายของเดือนก่อนหน้า
        const lastDayPrevMonth = new Date(selectedYear, selectedMonth, 0);
        const dateKey = formatDateForInput(lastDayPrevMonth);
        
        // ถ้ามี balance ของวันนั้น ให้ใช้ endBalance
        if (dailyBalances[dateKey]) {
            return dailyBalances[dateKey].endBalance;
        }
        
        // ถ้าไม่มี ให้หา balance ล่าสุดก่อนวันนั้น
        const allDates = Object.keys(dailyBalances).sort();
        const prevDate = allDates.filter(date => date < dateKey).pop();
        
        return prevDate ? dailyBalances[prevDate].endBalance : 0;
    }

    // เพิ่มฟังก์ชันที่จำเป็นกลับเข้าไป
    function formatAmount(amount) {
        if (!amount) return '0';
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toFixed(0);
    }

    function getMonthlyPnLClass() {
        const pnl = monthlyStats.pnl;
        if (pnl > 0) return 'text-green-500 dark:text-green-400 sweet:text-sweet-success';
        if (pnl < 0) return 'text-red-500 dark:text-red-400 sweet:text-sweet-danger';
        return 'text-light-text dark:text-dark-text sweet:text-sweet-text';
    }

    // เพิ่มฟังก์ชันสำหรับจัดการ click outside
    function handleClickOutside(event) {
        const dropdown = document.querySelector('.date-picker-dropdown');
        const button = document.querySelector('.date-picker-button');
        
        if (dropdown && !dropdown.contains(event.target) && !button.contains(event.target)) {
            showDatePicker = false;
        }
    }

    // เพิ่มฟังก์ชันสำหรับจัดการ scroll
    function handleScroll() {
        if (showDatePicker) {
            showDatePicker = false;
        }
    }

    onMount(() => {
        // เพิ่ม event listeners
        document.addEventListener('click', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            // cleanup event listeners
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    });

    // Add WebSocket setup function
    function setupBinanceWebSocket() {
        isLoadingPrices = true;
        
        if (binanceWs) {
            binanceWs.close();
        }

        const openTrades = trades.filter(t => t.status === "OPEN");
        const symbols = [...new Set(openTrades.map(t => t.symbol.toLowerCase()))];
        
        if (symbols.length === 0) {
            isLoadingPrices = false;
            return;
        }

        binanceWs = binanceExchange.createPriceWebSocket(symbols);

        binanceWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'markPriceUpdate') {
                isLoadingPrices = false;
                const symbol = data.s;
                const price = parseFloat(data.p);
                currentPrices.set(symbol, price);
                currentPrices = new Map(currentPrices); // Create new Map to trigger reactivity
            }
        };

        binanceWs.onerror = () => {
            isLoadingPrices = false;
        };
    }

    // Setup WebSocket when trades change
    $: if (!isPreview && trades.some(t => t.status === "OPEN") && $accountStore.currentAccount?.type === 'BINANCE_FUTURES') {
        setupBinanceWebSocket();
    }

    // Cleanup WebSocket on component destroy
    onMount(() => {
        return () => {
            if (binanceWs) {
                binanceWs.close();
            }
        };
    });
</script>

<div class="card h-full flex flex-col">
    <!-- Header -->
    <div class="p-3 border-b border-light-border dark:border-dark-border bg-gradient-to-r from-theme-500/5 to-transparent dark:from-theme-500/10">
        <div class="flex items-center gap-3">
            <!-- Left: Calendar icon & Month selector -->
            <div class="flex items-center gap-2 relative">
                <div class="w-8 h-8 rounded-lg bg-theme-500/10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>

                <!-- Month Picker Button & Dropdown -->
                <div class="relative inline-block">
                    <button 
                        class="text-base font-semibold text-light-text dark:text-dark-text flex items-center gap-1 date-picker-button" 
                        on:click|stopPropagation={() => showDatePicker = !showDatePicker}
                    >
                    {months[selectedMonth]} {selectedYear}
                    <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    </button>

                    {#if showDatePicker}
                        <div 
                            class="absolute left-0 top-full mt-1 z-50 p-3 rounded-lg shadow-xl 
                                   border border-light-border dark:border-dark-border
                                   bg-light-card dark:bg-dark-card backdrop-blur-lg w-[280px] date-picker-dropdown"
                            transition:fade={{ duration: 150 }}
                            on:click|stopPropagation
                        >
                            <div class="flex flex-col gap-3">
                                <!-- Year selector -->
                                <div class="flex flex-col gap-1.5">
                                    <div class="text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                        Year
                                    </div>
                                    <div class="grid grid-cols-3 gap-1">
                                        {#each years as year}
                                            <button
                                                class="px-3 py-1.5 rounded text-xs font-medium
                                                       {year === selectedYear 
                                                           ? 'bg-theme-500 text-white' 
                                                           : 'hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text'}"
                                                on:click={() => selectedYear = year}
                                            >
                                                {year}
                                            </button>
                                        {/each}
                                    </div>
                                </div>

                                <!-- Month selector -->
                                <div class="flex flex-col gap-1.5">
                                    <div class="text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                        Month
                                    </div>
                                    <div class="grid grid-cols-4 gap-1">
                                        {#each months as month, i}
                                            <button
                                                class="px-2 py-1.5 rounded text-xs font-medium relative
                                                       {i === selectedMonth 
                                                           ? 'bg-theme-500 text-white' 
                                                           : 'bg-light-hover/50 dark:bg-dark-hover/50 hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text'}"
                                                on:click={() => {
                                                    selectedMonth = i;
                                                    showDatePicker = false;
                                                }}
                                            >
                                                {#if i === new Date().getMonth() && selectedYear === new Date().getFullYear()}
                                                    <div class="absolute -top-0.5 -right-0.5">
                                                        <div class="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse"></div>
                                                    </div>
                                                {/if}
                                                <span class="truncate">{month.slice(0, 3)}</span>
                                            </button>
                                        {/each}
                                    </div>
                                </div>

                                <!-- Quick action -->
                                <button
                                    class="w-full px-2 py-1.5 text-xs font-medium rounded
                                           bg-theme-500/10 text-theme-500 dark:text-theme-400
                                           hover:bg-theme-500/20 transition-colors"
                                    on:click={() => {
                                        const now = new Date();
                                        selectedMonth = now.getMonth();
                                        selectedYear = now.getFullYear();
                                        showDatePicker = false;
                                    }}
                                >
                                    Jump to Today
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Center: Monthly Stats (Card-like) -->
            <div class="flex-1 rounded-lg bg-light-background/50 dark:bg-dark-background/50 sweet:bg-sweet-bg/50 p-1.5 flex items-center">
                <div class="flex items-center gap-1 flex-wrap">
                    <!-- Open Trades -->
                    {#if monthlyStats.openTrades > 0}
                        <span class="text-xs whitespace-nowrap bg-yellow-500/10 dark:bg-yellow-400/10 sweet:bg-yellow-400/10 px-1 rounded text-yellow-600 dark:text-yellow-400 sweet:text-yellow-500">
                            {monthlyStats.openTrades} open
                        </span>
                    {/if}
                    <!-- Win Trades -->
                    {#if monthlyStats.wins > 0}
                        <span class="text-xs whitespace-nowrap bg-green-500/10 dark:bg-green-400/10 sweet:bg-sweet-success/10 px-1 rounded text-green-600 dark:text-green-400 sweet:text-sweet-success">
                            {monthlyStats.wins} win
                        </span>
                    {/if}
                    <!-- Loss Trades -->
                    {#if monthlyStats.losses > 0}
                        <span class="text-xs whitespace-nowrap bg-red-500/10 dark:bg-red-400/10 sweet:bg-sweet-danger/10 px-1 rounded text-red-600 dark:text-red-400 sweet:text-sweet-danger">
                            {monthlyStats.losses} loss
                        </span>
                    {/if}
                </div>
                <div class="ms-auto flex items-center gap-2">
                    <span class="text-sm font-bold {getMonthlyPnLClass()}">
                        {formatPnL(monthlyStats.pnl)}
                    </span>
                    <!-- แสดง monthly percentage ถ้ามีค่า -->
                    {#if monthlyStats.monthlyPercentage !== 0}
                        <span class="text-xs {monthlyStats.pnl >= 0 ? 'text-green-500 dark:text-green-500 sweet:text-sweet-success' : 'text-red-500 dark:text-red-500 sweet:text-sweet-danger'}">
                            {monthlyStats.monthlyPercentage}%
                        </span>
                    {/if}
                    <!-- แสดง volume -->
                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted sweet:text-sweet-text-muted">
                        ${formatAmount(monthlyStats.volume)}
                    </span>
                </div>
            </div>

            <!-- Right: Navigation -->
            <div class="flex items-center gap-1">
                <button class="p-1" on:click={previousMonth} aria-label="Previous month">
                    <svg class="h-6 w-6 text-white bg-theme-500 hover:bg-theme-600 rounded-md" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z"/>
                        <polyline points="15 6 9 12 15 18" />
                    </svg>
                </button>
                <button class="p-1" on:click={nextMonth} aria-label="Next month">
                    <svg class="h-6 w-6 text-white bg-theme-500 hover:bg-theme-600 rounded-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z"/>
                        <polyline points="9 6 15 12 9 18" />
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <div class="flex-1 p-4 flex flex-col">
        <div class="grid grid-cols-7 gap-1">
            {#each ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as day}
                <div
                    class="text-center py-1 text-sm font-medium text-light-text-muted dark:text-dark-text-muted"
                >
                    {day}
                </div>
            {/each}
        </div>

        <div class="grid grid-cols-7 gap-1 lg:gap-1.5 flex-1 {$theme === 'dark' ? 'dark-calendar' : ''} {$theme === 'sweet' ? 'sweet-calendar' : ''}">
            {#each calendarDays as day, index (day !== null ? day : 'empty-' + index)}
                {#if day !== null}
                    <div class="relative calendar-day-cell">
                        <div
                            class="absolute inset-0 {getCardClass(statsPerDay[day], day)} 
                                   hover:shadow 
                                   {!isFutureDate(day) && 'transform hover:scale-[1.04] transition-transform duration-300 ease-in-out'} 
                                   {isToday(day) ? 'today-card' : ''}"
                            on:click={() => handleDayClick(day, statsPerDay[day])}
                        >

                            <!-- เนื้อหาปกติ -->
                            <div class="relative h-full flex flex-col z-20">
                                <div class=" absolute top-0 end-0 pt-0.5 px-1 pb-0 text-sm font-medium text-light-text-muted dark:text-dark-text-muted sweet:text-sweet-text-muted">
                                    <div class="flex w-full justify-between items-center">

                                        <span class="ml-auto">{day}</span>
                                    </div>
                                </div>
                                <div class=" absolute top-0 start-0 pt-0.5 px-1 pb-0 text-sm font-medium text-light-text-muted dark:text-dark-text-muted sweet:text-sweet-text-muted">
                                    <div class="flex w-full justify-between items-center">
                                        {#if isToday(day)}
                                            <span class="text-xs text-purple-500 dark:text-purple-400 sweet:text-sweet-primary">today</span>
                                        {/if}
                                    </div>
                                </div>

                                {#if statsPerDay[day]}
                                    <div
                                        class="absolute top-0 md:-top-2 inset-0 p-1.5 pt-5 flex flex-col"
                                    >
                                    <div class={`border-s border-s-[2.25px] border-transparent ${statsPerDay[day].pnl === 0 ? '' : statsPerDay[day].pnl < 0 ? 'dark:border-red-600 sweet:border-sweet-danger ps-1' : 'dark:border-green-600 sweet:border-sweet-success ps-1'}`}>
                                        {#if statsPerDay[day].trades.length > 0}
                                        {@const isShowAllState = !(statsPerDay[day].openTrades > 0 && statsPerDay[day].wins > 0 && statsPerDay[day].losses > 0)}
                                            <div class="trade-stats space-y-0.5 overflow-y-auto">
                                                <div class=" hidden md:flex items-center gap-1 flex-wrap">
                                                    
                                                    {#if statsPerDay[day].openTrades > 0}
                                                        <span class="text-xs whitespace-nowrap bg-yellow-500/10 dark:bg-yellow-400/10 sweet:bg-yellow-400/10 px-1 rounded text-yellow-600 dark:text-yellow-400 sweet:text-yellow-500">
                                                            {statsPerDay[day].openTrades}
                                                            {#if isShowAllState}
                                                                open
                                                            {:else}
                                                                <span class="text-xxs">open</span>
                                                            {/if}

                                                        </span>
                                                    {/if}
                                                    <div class="trade-results gap-1 text-xs">
                                                        {#if statsPerDay[day].wins > 0}
                                                            <span class="whitespace-nowrap bg-green-500/10 dark:bg-green-400/10 sweet:bg-sweet-success/10 px-1 rounded text-green-600 dark:text-green-400 sweet:text-sweet-success">
                                                                {statsPerDay[day].wins}
                                                                {#if isShowAllState}
                                                                win
                                                                {:else}
                                                                <span class="text-xxs">win</span>
                                                                {/if}
                                                            </span>
                                                        {/if}
                                                        {#if statsPerDay[day].losses > 0}
                                                            <span class="whitespace-nowrap bg-red-500/10 dark:bg-red-400/10 sweet:bg-sweet-danger/10 px-1 rounded text-red-600 dark:text-red-400 sweet:text-sweet-danger">
                                                                {statsPerDay[day].losses}
                                                                {#if isShowAllState}
                                                                    loss
                                                                {:else}
                                                                <span class="text-xxs">loss</span>
                                                                {/if}
                                                            </span>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>
                                        {/if}
                                        {#if statsPerDay[day].pnl !== 0}
                                            <div class="pnl-stats mt-auto flex-wrap flex flex-col md:flex-row justify-between items-start md:items-center">
                                                <span class="text-sm font-bold whitespace-nowrap {getTextClass(statsPerDay[day])}">
                                                    {formatPnL(statsPerDay[day].pnl)}
                                                </span>
                                                {#if $dailyBalancesStore[formatDateForInput(new Date(selectedYear, selectedMonth, day))]?.startBalance && !isNaN($dailyBalancesStore[formatDateForInput(new Date(selectedYear, selectedMonth, day))].startBalance) && $dailyBalancesStore[formatDateForInput(new Date(selectedYear, selectedMonth, day))].startBalance !== 0}
                                                    <span class="pnl-percentage whitespace-nowrap text-xs {getTextClass(statsPerDay[day])}">
                                                        {((statsPerDay[day].pnl / Math.abs($dailyBalancesStore[formatDateForInput(new Date(selectedYear, selectedMonth, day))].startBalance)) * 100).toFixed(1)}%
                                                    </span>
                                                {:else}
                                                    <span class="pnl-percentage whitespace-nowrap text-xs text-light-text-muted dark:text-dark-text-muted sweet:text-sweet-text-muted">
                                                        N/A
                                                    </span>
                                                {/if}
                                            </div>
                                        {/if}

                                        {#if statsPerDay[day].openTrades > 0}
                                            <div class="pnl-stats flex-wrap flex flex-col md:flex-row justify-between items-start md:items-center">
                                                <span class="text-sm font-bold whitespace-nowrap text-yellow-600 dark:text-yellow-400 sweet:text-yellow-500">
                                                    {#if isLoadingPrices}
                                                        Loading...
                                                    {:else}
                                                        {formatPnL(statsPerDay[day].unrealizedPnl || 0)}
                                                    {/if}
                                                </span>
                                                {#if $dailyBalancesStore[formatDateForInput(new Date(selectedYear, selectedMonth, day))]?.startBalance && !isNaN($dailyBalancesStore[formatDateForInput(new Date(selectedYear, selectedMonth, day))].startBalance) && $dailyBalancesStore[formatDateForInput(new Date(selectedYear, selectedMonth, day))].startBalance !== 0}
                                                    <span class="pnl-percentage whitespace-nowrap text-xs text-yellow-600 dark:text-yellow-400 sweet:text-yellow-500">
                                                        {#if isLoadingPrices}
                                                            Loading...
                                                        {:else}
                                                            {((statsPerDay[day].unrealizedPnl || 0) / Math.abs($dailyBalancesStore[formatDateForInput(new Date(selectedYear, selectedMonth, day))].startBalance) * 100).toFixed(1)}%
                                                        {/if}
                                                    </span>
                                                {:else}
                                                    <span class="pnl-percentage whitespace-nowrap text-xs text-light-text-muted dark:text-dark-text-muted sweet:text-sweet-text-muted">
                                                        N/A
                                                    </span>
                                                {/if}
                                            </div>
                                        {/if}

                                        {#if statsPerDay[day].transactions.length > 0}
                                            <div
                                                class="absolute  bottom-1 right-1 flex gap-0.5 items-center opacity-60 dark:opacity-80"
                                            >
                                                {#if statsPerDay[day].transactions.some((t) => t.type === "deposit")}
                                                    <div class="flex items-center">
                                                        <svg
                                                            class="w-[17px] h-[17px] text-green-600 dark:text-green-400 sweet:text-sweet-success"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    </div>
                                                {/if}
                                                {#if statsPerDay[day].transactions.some((t) => t.type === "withdrawal")}
                                                    <div class="flex items-center">
                                                        <svg
                                                            class="w-[17px] h-[17px] text-red-600 dark:text-red-400 sweet:text-sweet-danger"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                {/if}

                                <!-- วันที่ว่างเท่านั้นที่จะมี hover effect -->
                                {#if !statsPerDay[day]?.pnl && !statsPerDay[day]?.openTrades && !statsPerDay[day]?.transactions?.length && !isFutureDate(day)}
                                    <div class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 z-30">
                                        <svg
                                            class="w-8 h-8 text-gray-400/50 dark:text-gray-500/50 sweet:text-sweet-text/50"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M12 4v16m8-8H4"
                                            />
                                        </svg>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {:else}
                    <div class="relative calendar-day-cell">
                    </div>
                {/if}
            {/each}
        </div>
    </div>
</div>

<DayTradesModal
    bind:show={showDayTradesModal}
    trades={selectedDayTrades}
    transactions={selectedDayTransactions}
    date={selectedDate}
    displayDate={selectedDisplayDate}
    accountId={$accountStore.currentAccount?._id}
    loading={dayTradesLoading}
    on:view={handleView}
    on:edit={handleEdit}
    on:delete={handleDelete}
    on:deleteTransaction={handleDeleteTransaction}
    on:newTrade={handleNewTrade}
    on:refresh={() => {
        // console.log('TradeCalendar: Received refresh event from modal');
        loadData();
    }}
    on:close={() => {
        // console.log('TradeCalendar: Modal closed');
        showDayTradesModal = false;
        selectedDayTrades = [];
        selectedDayTransactions = [];
        selectedDate = "";
        selectedDisplayDate = "";
        selectedDayBalance = null;
    }}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card 
               border border-light-border dark:border-0
               rounded-lg shadow-lg;
    }

    /* Default styles สำหรับ mobile */
    .calendar-day-cell {
        position: relative;
        min-height: 80px;
    }

    /* Desktop styles (md ขึ้นไป) */
    @media (min-width: 768px) {
        .calendar-day-cell {
            min-height: initial; /* ยกเลิก min-height */
        }
    }

    /* Mobile styles */
    @media (max-width: 767px) {
        .trade-stats {
            display: flex;
            flex-direction: column;
        }

        .pnl-stats {
            gap: 0.25rem;
        }

        .pnl-percentage {
            margin-left: 0;
        }
    }

    /* Desktop styles */
    @media (min-width: 768px) {
        .trade-stats {
            display: flex;
            flex-direction: row;
        }

        .pnl-stats {
            gap: 0.5rem;
        }
    }

    /* Dark mode styles */
    :global(.dark) .dark-calendar {
        @apply gap-2; /* เพิ่ม gap ระหว่าง cell ใน dark mode */
    }

    /* เพิ่ม styles สำหรับ today card animation */
    @keyframes border-dance {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    :global(.today-card) {
        position: relative;
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        background-color: theme(colors.indigo.50/0.1);
    }

    :global(.today-card)::before {
        content: '';
        position: absolute;
        inset: -2px;
        z-index: 1;
        border-radius: 0.5rem;
        padding: 2px;
        pointer-events: none;
        background: linear-gradient(
            45deg,
            theme(colors.purple.400),
            theme(colors.blue.400),
            theme(colors.indigo.400),
            theme(colors.purple.400)
        );
        background-size: 300% 300%;
        animation: border-dance 4s ease infinite;
        -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
    }

    :global(.today-card > *) {
        position: relative;
        z-index: 2;
    }

    :global(.dark .today-card) {
        background-color: theme(colors.indigo.900/0.1);
    }

    :global(.today-card:hover)::before {
        animation: border-dance 2s ease infinite;
    }

    @keyframes border-dance {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    :global(.animate-border-dance) {
        animation: border-dance 4s ease infinite;
        background-size: 300% 300%;
    }

    :global(.animate-border-dance:hover) {
        animation: border-dance 2s ease infinite;
    }

    /* เพิ่ม styles สำหรับ sweet theme calendar */
    :global(.sweet) .sweet-calendar {
        @apply gap-2; /* เพิ่ม gap ระหว่าง cell ใน sweet mode */
    }

    /* เพิ่ม animation สำหรับ sweet theme */
    :global(.sweet) .today-card::before {
        background: linear-gradient(
            45deg, 
            theme(colors.pink.300), 
            theme(colors.blue.300), 
            theme(colors.yellow.300),
            theme(colors.pink.300)
        );
        background-size: 300% 300%;
    }
</style>
