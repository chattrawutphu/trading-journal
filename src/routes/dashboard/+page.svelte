<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import WidgetLayout from "$lib/components/dashboard/WidgetLayout.svelte";
    import TradeModal from "$lib/components/trades/TradeModal.svelte";
    import TradeViewModal from "$lib/components/trades/TradeViewModal.svelte";
    import NewAccountModal from "$lib/components/accounts/NewAccountModal.svelte";
    import Loading from "$lib/components/common/Loading.svelte";
    import Button from "$lib/components/common/Button.svelte";
    import Modal from "$lib/components/common/Modal.svelte";
    import { api } from "$lib/utils/api";
    import { loadingStore } from '$lib/stores/loadingStore';
    import { layoutStore } from '$lib/stores/layoutStore';
    import { createDefaultLayout } from '$lib/utils/widgetUtils';
    import { fade } from 'svelte/transition';
    import LimitReachedModal from '$lib/components/common/LimitReachedModal.svelte';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { goto } from '$app/navigation';
    import Toast from '$lib/components/common/Toast.svelte';
    import { formatTrades, filterDuplicateTrades, getLatestTradeDate, syncTrades } from '$lib/utils/importTrades';
    import EditLayoutModal from '$lib/components/dashboard/EditLayoutModal.svelte';
    import { page } from '$app/stores';

    const dispatch = createEventDispatcher();

    // Add helper functions
    function createUniqueId(baseType) {
        return `${baseType}_${generateUUID()}`;
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Rest of the existing script remains the same...
    let error = "";
    let openTrades = [];
    let closedTrades = [];
    let showEditModal = false;
    let showViewModal = false;
    let showAccountModal = false;
    let selectedTrade = null;
    let currentAccountId = null;
    let editMode = false;
    let trades = [];

    // Layout management
    let layouts = [{
        name: 'Default',
        widgets: []  // Initialize empty, will be populated after data loads
    }];
    let activeLayoutIndex = 0;
    let showNewLayoutModal = false;
    let newLayoutName = '';
    let showLayoutDropdown = false;

    // Add state for temporary layout
    let tempLayouts = null;

    // เพิ่มตัวแปรเพื่อติดตามการเปลี่ยนแปลง URL parameter
    let mounted = false;

    // เพิ่ม function สำหรับตรวจสอบ limit
    function checkLayoutLimit() {
        if ($subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC && layouts.length >= 2) {
            showNewLayoutModal = false;
            showUpgradeModal = true;
            return true;
        }
        return false;
    }

    function getNextAvailableLayoutName() {
        let layoutNumber = 1;
        let layoutName = `Layout-${layoutNumber}`;
        
        // Check if layout name already exists
        while (layouts.some(layout => layout.name === layoutName)) {
            layoutNumber++;
            layoutName = `Layout-${layoutNumber}`;
        }
        
        return layoutName;
    }

    onMount(async () => {
        try {
            loadingStore.set(true);
            const account = await accountStore.loadAccounts();
            if (account) {
                await Promise.all([
                    loadTrades(),
                    transactionStore.fetchTransactions($accountStore.currentAccount._id),
                ]);
                // Load layouts from localStorage
                await loadLayouts();
                
                // ตรวจสอบ URL parameter และเลือก layout ตามที่ระบุ
                const layoutParam = $page.url.searchParams.get('layout');
                if (layoutParam !== null && layoutParam !== undefined) {
                    const layoutIndex = parseInt(layoutParam);
                    if (!isNaN(layoutIndex) && layoutIndex >= 0 && layoutIndex < layouts.length) {
                        activeLayoutIndex = layoutIndex;
                        // อัพเดต layoutStore ด้วย
                        layoutStore.setActiveLayout(layoutIndex);
                    }
                }
            }
            
            // ตั้งค่า mounted เป็น true เมื่อโหลดเสร็จสมบูรณ์
            mounted = true;
        } catch (err) {
            error = err.message;
        } finally {
            loadingStore.set(false);
        }
    });

    // เพิ่ม reactive statement เพื่อติดตามการเปลี่ยนแปลงของ URL
    $: if (mounted && $page) {
        const layoutParam = $page.url.searchParams.get('layout');
        if (layoutParam !== null && layoutParam !== undefined) {
            const layoutIndex = parseInt(layoutParam);
            if (!isNaN(layoutIndex) && layoutIndex >= 0 && layoutIndex < layouts.length) {
                // อัปเดต activeLayoutIndex เมื่อ URL เปลี่ยน
                activeLayoutIndex = layoutIndex;
                // อัพเดต layoutStore ด้วย
                layoutStore.setActiveLayout(layoutIndex);
                
                // Dispatch a custom event to notify other components
                window.dispatchEvent(new CustomEvent('layoutchange', { 
                    detail: { layoutIndex } 
                }));
                
                // console.log(`Dashboard detected layout change to ${layoutIndex}`);
            }
        }
    }

    // Modified loadLayouts function
    async function loadLayouts() {
        try {
            dispatch('setLoading', true);
            const savedLayouts = await layoutStore.loadLayouts();
            
            if (savedLayouts && savedLayouts.length > 0) {
                // อัพเดต layouts จาก store
                layoutStore.subscribe(state => {
                    layouts = state.layouts || [];
                    // ตั้งค่า activeLayoutIndex ถ้ายังไม่ได้กำหนด
                    if (activeLayoutIndex === undefined || activeLayoutIndex >= layouts.length) {
                        activeLayoutIndex = 0;
                    }
                })();
            } else {
                // ถ้าไม่มี layouts ในฐานข้อมูล สร้าง layout เริ่มต้น
                layouts = [createDefaultLayout()];
                // และบันทึกลงฐานข้อมูล
                await layoutStore.saveLayouts(layouts);
            }
        } catch (error) {
            console.error('Error loading layouts from database:', error);
            // กำหนดค่าเริ่มต้น
            layouts = [createDefaultLayout()];
            activeLayoutIndex = 0;
            
            // แสดงข้อความผิดพลาด
            error = 'Failed to load layouts from server. Using default layout.';
            showToast = true;
            toastType = 'error';
            toastMessage = error;
        } finally {
            dispatch('setLoading', false);
        }
    }

    // Modified saveLayouts function
    async function saveLayouts() {
        try {
            dispatch('setLoading', true);
            await layoutStore.saveLayouts(layouts);
            // แสดงข้อความสำเร็จ
            toastType = 'success';
            toastMessage = 'Layout saved successfully';
            showToast = true;
            
            // ส่ง event เพื่อแจ้งว่า layouts มีการเปลี่ยนแปลง
            window.dispatchEvent(new CustomEvent('layoutupdate'));
        } catch (error) {
            console.error('Error saving layouts to database:', error);
            toastType = 'error';
            toastMessage = 'Failed to save layouts. Please try again.';
            showToast = true;
        } finally {
            dispatch('setLoading', false);
        }
    }

    // Modified addNewLayout function
    async function addNewLayout() {
        if (checkLayoutLimit()) return;

        if (newLayoutName.trim()) {
            layouts = [...layouts, {
                name: newLayoutName.trim(),
                icon: 'dashboard',
                widgets: []
            }];
            try {
                await saveLayouts();
                activeLayoutIndex = layouts.length - 1;
                showNewLayoutModal = false;
                newLayoutName = '';
            } catch (error) {
                console.error('Error adding new layout:', error);
            }
        }
    }

    // Modified deleteLayout function
    async function deleteLayout(index) {
        if (layouts.length > 1 && confirm('Are you sure you want to delete this layout?')) {
            layouts = layouts.filter((_, i) => i !== index);
            try {
                await saveLayouts();
                if (activeLayoutIndex >= layouts.length) {
                    activeLayoutIndex = layouts.length - 1;
                }
            } catch (error) {
                // Handle error
                console.error('Error deleting layout:', error);
            }
        }
    }

    // Modified function to handle edit mode
    function handleEditModeChange(e) {
        editMode = e.detail;
        if (editMode) {
            // console.log('🔄 Storing current layouts state');
            // Store current layouts state when entering edit mode
            tempLayouts = JSON.parse(JSON.stringify(layouts));
        }
    }

    // Modified handleUpdateWidgets
    function handleUpdateWidgets(e) {
        if (layouts[activeLayoutIndex]) {
            layouts[activeLayoutIndex].widgets = e.detail;
            // Force update
            layouts = [...layouts];
        }
    }

    // Add new function to handle layout save
    async function handleSaveLayout(widgets) {
        try {
            /* console.log('💾 Saving layout from dashboard', {
                layoutIndex: activeLayoutIndex,
                layoutName: layouts[activeLayoutIndex]?.name
            });*/
            
            if (layouts[activeLayoutIndex]) {
                layouts[activeLayoutIndex].widgets = widgets;
                await saveLayouts();
            }
        } catch (error) {
            console.error('❌ Error saving layout:', error);
            error = 'Failed to save layout. Please try again.';
        }
    }

    async function loadTrades() {
        if (!$accountStore.currentAccount) return;

        const accountId = $accountStore.currentAccount._id;

        try {
            error = "";
            const response = await api.getTrades(accountId);
            trades = response;
            openTrades = response.filter((trade) => trade.status === "OPEN");
            closedTrades = response.filter((trade) => trade.status === "CLOSED");
        } catch (err) {
            error = err.message;
        }
    }
    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId) {
        currentAccountId = $accountStore.currentAccount?._id;
        if (currentAccountId) {
            loadTrades();
            transactionStore.fetchTransactions(currentAccountId);
        }
    }

    function handleNewTradeFromCalendar() {
        selectedTrade = null;
        showEditModal = true;
    }

    function handleView(event) {
        selectedTrade = event.detail;
        showViewModal = true;
    }

    function handleEdit(event) {
        selectedTrade = event.detail;
        showEditModal = true;
    }

    async function handleDelete(event) {
        try {
            dayTradesLoading = true; // Set loading to true
            error = "";

            await api.deleteTrade(event.detail);
            await loadTrades();
            // Refresh account data to update balance
            await accountStore.setCurrentAccount(
                $accountStore.currentAccount._id,
            );
            // Dispatch trade update event for stats
            window.dispatchEvent(new CustomEvent("tradeupdate"));
            showDayModal = false;
        } catch (err) {
            error = err.message;
        } finally {
            dayTradesLoading = false; // Set loading to false
        }
    }

    async function handleDeleteTransaction(transactionId) {
        try {
            dayTradesLoading = true; // Set loading to true
            error = "";

            await transactionStore.deleteTransaction(transactionId);
            // Fetch updated transactions
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
        } catch (err) {
            error = err.message;
        } finally {
            dayTradesLoading = false; // Set loading to false
        }
    }

    function closeViewModal() {
        showViewModal = false;
        selectedTrade = null;
    }

    function handleNewTrade() {
        selectedTrade = null; 
        showEditModal = true;
    }

    function handleAddAccount() {
        showAccountModal = true;
    }

    $: totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    $: winRate =
        closedTrades.length > 0
            ? Math.round(
                  (closedTrades.filter((t) => t.pnl > 0).length /
                      closedTrades.length) *
                      100,
              )
            : 0;

    function handleTradeView(trade) {
        selectedTrade = trade;
        showViewModal = true;
    }

    function handleTradeEdit(trade) {
        selectedTrade = trade;
        showEditModal = true;
    }

    async function handleTradeFavorite(tradeId) {
        try {
            await loadTrades();
        } catch (error) {
            console.error('Error updating favorite:', error);
        }
    }

    async function handleTransactionFavorite(transactionId) {
        try {
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
        } catch (error) {
            console.error('Error updating favorite:', error);
        }
    }

    async function handleTradeDelete(event) {
        try {
            const { items } = event;
            await api.deleteTrades(items);
            await loadTrades();
        } catch (error) {
            console.error('Error deleting trades:', error);
        }
    }

    // Shared function to reload layout and refresh widgets
    async function reloadLayoutAndRefresh() {
        dispatch('setLoading', true);
        
        try {
            const savedLayouts = await layoutStore.loadLayouts();
            
            if (savedLayouts && savedLayouts.length > 0) {
                layouts = savedLayouts;
                if (layouts[activeLayoutIndex]) {
                    layouts[activeLayoutIndex].widgets = [...layouts[activeLayoutIndex].widgets];
                }
            }
        } catch (error) {
            console.error('Error reloading layout:', error);
        } finally {
            dispatch('setLoading', false);
        }
    }

    async function handleTradeUpdated() {
        await loadTrades();
        showEditModal = false;
        selectedTrade = null;
        await reloadLayoutAndRefresh();
    }

    async function cancelEdit() {
        await reloadLayoutAndRefresh();
        editMode = false;
        dispatch('editModeChange', false);
    }

    function handleSetLoading(e) {
        loadingStore.set(e.detail);
    }

    // เพิ่ม event handlers สำหรับ click outside และ scroll
    function handleClickOutside(event) {
        const dropdown = document.querySelector('.layout-picker-dropdown');
        const button = document.querySelector('.layout-picker-button');
        
        if (dropdown && !dropdown.contains(event.target) && !button.contains(event.target)) {
            showLayoutDropdown = false;
        }
    }

    function handleScroll() {
        if (showLayoutDropdown) {
            showLayoutDropdown = false;
        }
    }

    onMount(() => {
        document.addEventListener('click', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    });

    // เพิ่ม function สำหรับ upgrade
    function upgradePlan() {
        showUpgradeModal = false;
        goto('/settings/subscription');
    }

    let showUpgradeModal = false;

    let syncingTrades = false;
    let toastType = '';
    let toastMessage = '';
    let showToast = false;
    
    async function handleSyncTrades() {
        if (!$accountStore.currentAccount) return;
        
        try {
            syncingTrades = true;
            error = "";
            
            const result = await syncTrades($accountStore.currentAccount._id, api);
            
            toastType = result.type;
            toastMessage = result.message;
            showToast = true;
            
            if (result.success && result.newTradesCount > 0) {
                // Reload data and refresh layout
                await loadTrades();
                await accountStore.setCurrentAccount($accountStore.currentAccount._id);
                await reloadLayoutAndRefresh();
            }
            
        } catch (err) {
            console.error('Error syncing trades:', err);
            error = err.message;
            toastType = 'error';
            toastMessage = `Error syncing trades: ${err.message}`;
            showToast = true;
        } finally {
            syncingTrades = false;
        }
    }

    // Modify the showNewLayoutModal block
    $: if (showNewLayoutModal) {
        newLayoutName = getNextAvailableLayoutName();
    }

    // เพิ่มตัวแปร
    let showEditLayoutModal = false;
    let selectedLayoutForEdit = null;
    let selectedLayoutIndex = 0;
    let isCreateMode = false;

    // เพิ่มฟังก์ชันเพื่อเปิด Modal แก้ไข Layout
    function editLayout(index) {
        if (index >= 0 && index < layouts.length) {
            isCreateMode = false;
            selectedLayoutIndex = index;
            // สร้าง deep copy เพื่อป้องกันการแก้ไข layout โดยตรง
            selectedLayoutForEdit = JSON.parse(JSON.stringify(layouts[index]));
            showEditLayoutModal = true;
        } else {
            console.error('Invalid layout index:', index);
        }
    }

    // ฟังก์ชันอัพเดท Layout
    async function updateLayout(event) {
        const { index, layout } = event.detail;
        
        if (index >= 0 && index < layouts.length) {
            // อัพเดตเฉพาะ layout ที่ต้องการแก้ไข โดยไม่กระทบ layouts อื่น
            layouts[index] = layout;
            
            try {
                await saveLayouts();
                
                // ตั้งค่า activeLayoutIndex ให้เป็น index ที่เพิ่งแก้ไข
                activeLayoutIndex = index;
                
                // อัพเดต URL parameter ให้สอดคล้องกับ layout ที่กำลังแสดง
                const url = new URL(window.location);
                url.searchParams.set('layout', index.toString());
                history.pushState({}, '', url);
            } catch (error) {
                console.error('Error updating layout:', error);
            }
        }
    }

    // ฟังก์ชันสำหรับการกดเลือก layout จาก dropdown หรือจุดอื่นๆ
    function switchLayout(index) {
        if (index >= 0 && index < layouts.length) {
            activeLayoutIndex = index;
            selectedLayoutIndex = index;
            selectedLayoutForEdit = JSON.parse(JSON.stringify(layouts[index]));
            showLayoutDropdown = false;
            
            // อัพเดต URL
            const url = new URL(window.location);
            url.searchParams.set('layout', index.toString());
            history.pushState({}, '', url);
            
            // อัพเดต layoutStore
            layoutStore.setActiveLayout(index);
        }
    }

    // เปลี่ยนจากการใช้ showNewLayoutModal เป็นใช้ EditLayoutModal ในโหมดสร้างใหม่
    function showCreateLayoutModal() {
        isCreateMode = true;
        selectedLayoutForEdit = null;
        selectedLayoutIndex = -1;
        showEditLayoutModal = true;
    }

    // ฟังก์ชันสำหรับการสร้าง layout ใหม่
    function handleCreateLayout(event) {
        const newLayout = event.detail;
        
        if (checkLayoutLimit()) return;
        
        layouts = [...layouts, newLayout];
        
        try {
            saveLayouts();
            activeLayoutIndex = layouts.length - 1;
        } catch (error) {
            console.error('Error adding new layout:', error);
        }
    }

    // 1. เพิ่ม reactive statement เพื่ออัพเดต selectedLayoutForEdit เมื่อ activeLayoutIndex เปลี่ยน
    $: if (activeLayoutIndex >= 0 && activeLayoutIndex < layouts.length) {
        selectedLayoutIndex = activeLayoutIndex;
        // อัพเดตเฉพาะเมื่อ EditLayoutModal ไม่ได้เปิดอยู่ (เพื่อป้องกันการอัพเดตขณะกำลังแก้ไข)
        if (!showEditLayoutModal) {
            selectedLayoutForEdit = { ...layouts[activeLayoutIndex] };
        }
    }

    // เพิ่มฟังก์ชัน getIconPath กลับเข้าไปใหม่
    function getIconPath(iconId) {
        const icons = {
            'dashboard': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            'chart': 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
            'trading': 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
            'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            'target': 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
            'money': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            'stats': 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
            'settings': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
        };
        
        return icons[iconId] || icons['dashboard'];
    }
</script>


<div class="space-y-4 p-1 lg:p-4 lg:py-0 py-0">
    {#if error}
        <div
            class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg"
        >
            <div class="flex">
                <svg
                    class="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clip-rule="evenodd"
                    />
                </svg>
                <span>{error}</span>
            </div>
        </div>
    {/if}

    <!-- Header -->
    <div class="flex justify-between items-center">
        <!-- Left side with title and edit button -->
        <div class="flex items-center gap-3">
            <!-- Replace the h1 title with this button -->
            <div class="relative inline-block">
                <button 
                    class="flex items-center text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent focus:outline-none layout-picker-button" 
                    on:click|stopPropagation={() => showLayoutDropdown = !showLayoutDropdown}
                >
                    Dashboard
                    <svg class="w-5 h-5 ml-2 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {#if showLayoutDropdown}
                    <div 
                        class="absolute left-0 top-full mt-1 z-50 p-2 rounded-lg shadow-xl 
                               border border-light-border dark:border-dark-border
                               bg-light-card dark:bg-dark-card backdrop-blur-lg w-[240px] layout-picker-dropdown"
                        transition:fade={{ duration: 150 }}
                        on:click|stopPropagation
                    >
                        <ul class="space-y-0.5">
                            {#each layouts as layout, i}
                                <li>
                                    <div class="flex items-center justify-between group">
                                        <button
                                            class="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm
                                                    {activeLayoutIndex === i 
                                                        ? 'bg-theme-100 dark:bg-theme-900/40 text-theme-500 dark:text-theme-400' 
                                                        : 'text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover'}"
                                            on:click={() => switchLayout(i)}
                                        >
                                            <svg class="w-4 h-4 flex-shrink-0 {activeLayoutIndex === i ? 'text-theme-500' : 'text-light-text-muted dark:text-dark-text-muted'}" 
                                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                      d={getIconPath(layout.icon || 'dashboard')} />
                                            </svg>
                                            <span>{layout.name}</span>
                                        </button>
                                        
                                        <div class="hidden group-hover:flex items-center">
                                            <button
                                                class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted 
                                                       hover:bg-light-hover dark:hover:bg-dark-hover
                                                       hover:text-theme-500 dark:hover:text-theme-400"
                                                on:click|stopPropagation={() => editLayout(i)}
                                                title="Edit layout"
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            
                                            {#if layouts.length > 1}
                                                <button
                                                    class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted 
                                                           hover:bg-light-hover dark:hover:bg-dark-hover
                                                           hover:text-red-500 dark:hover:text-red-400"
                                                    on:click|stopPropagation={() => deleteLayout(i)}
                                                    title="Delete layout"
                                                >
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            {/if}
                                        </div>
                                    </div>
                                </li>
                            {/each}
                            
                            <li class="border-t border-light-border dark:border-dark-border mt-2 pt-2">
                                <button
                                    class="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm
                                           text-theme-500 dark:text-theme-400 hover:bg-light-hover dark:hover:bg-dark-hover"
                                    on:click={showCreateLayoutModal}
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>Add New Layout</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                {/if}
            </div>

            <!-- Add Edit Layout Button -->
            {#if $accountStore.currentAccount && !editMode}
                <button
                    class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
                           text-light-text-muted dark:text-dark-text-muted
                           hover:bg-light-hover dark:hover:bg-dark-hover
                           border border-light-border dark:border-0
                           transition-colors duration-200"
                    on:click={() => editMode = true}
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span class="hidden md:block">Edit layout</span>
                    
                </button>
            {/if}
        </div>

        {#if $accountStore.currentAccount}
            <div class="flex items-center gap-4">
                {#if ['BINANCE_FUTURES', 'BYBIT', 'OKEX'].includes($accountStore.currentAccount.type)}
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        loading={syncingTrades}
                        on:click={handleSyncTrades}
                    >
                        <div class="flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span class="hidden md:flex">Sync Trades</span>
                        </div>
                    </Button>
                {/if}
                <Button variant="primary" size="sm" on:click={handleNewTrade}>
                    <svg
                        class="w-5 h-5 mr-0 md:mr-2"
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
                    <span class="hidden md:flex">New Trade</span>
                </Button>
            </div>
        {/if}
    </div>

    <!-- Content -->
    <div class="relative">
        {#if $loadingStore}
            <Loading message="Loading..." overlay={true} />
        {/if}
        
        <div class="transition-opacity duration-200" class:opacity-0={$loadingStore}>
            {#if $accountStore.currentAccount}
                <WidgetLayout 
                    {trades}
                    accountId={$accountStore.currentAccount._id}
                    {openTrades} 
                    {closedTrades} 
                    {totalPnL} 
                    {winRate}
                    widgets={layouts[activeLayoutIndex]?.widgets || []}
                    {activeLayoutIndex}
                    bind:editMode
                    on:updateWidgets={handleUpdateWidgets}
                    onSaveLayout={handleSaveLayout}
                    on:editModeChange={(e) => editMode = e.detail}
                    on:setLoading={handleSetLoading}
                    on:view={handleView}
                    on:edit={handleEdit}
                    on:newTrade={() => {
                        selectedTrade = null;
                        showEditModal = true;
                    }}
                />
            {:else}
                <div class="card p-16 text-center space-y-6">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <svg
                            class="w-16 h-16 text-light-text-muted dark:text-dark-text-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>
                        <h2
                            class="text-2xl font-bold text-light-text dark:text-dark-text"
                        >
                            Create an account to see your trading statistics
                        </h2>
                        <p
                            class="text-light-text-muted dark:text-dark-text-muted max-w-md"
                        >
                            Track your performance, analyze your trades, and improve
                            your trading strategy with our comprehensive trading tools.
                        </p>
                        <Button variant="primary" size="sm" on:click={handleAddAccount}>
                            <svg
                                class="w-5 h-5 mr-2"
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
                            Add Account
                        </Button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Existing Modals remain the same -->
<NewAccountModal
    bind:show={showAccountModal}
    on:close={() => (showAccountModal = false)}
    on:refreshLayout={async () => {
        // รีโหลด layout และ refresh widgets
        await reloadLayoutAndRefresh();
        
        // โหลดข้อมูล account ใหม่
        await accountStore.loadAccounts();
        
        // โหลดข้อมูล trades ใหม่
        if ($accountStore.currentAccount) {
            await loadTrades();
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
        }
    }}
/>

{#if $accountStore.currentAccount}
    <TradeModal
        bind:show={showEditModal}
        trade={selectedTrade}
        accountId={$accountStore.currentAccount._id}
        on:tradeUpdated={handleTradeUpdated}
    />

    <TradeViewModal
        bind:show={showViewModal}
        trade={selectedTrade}
        on:close={closeViewModal}
    />
{/if}

<!-- เพิ่ม Upgrade Modal -->
{#if showUpgradeModal}
    <LimitReachedModal
        show={showUpgradeModal}
        title="Layout Limit Reached"
        description="Basic users are limited to 2 layouts. Upgrade to Pro for unlimited layouts and advanced features."
        upgradeText="Upgrade to Pro"
        cancelText="Maybe Later"
        width="md"
        on:close={() => showUpgradeModal = false}
        on:upgrade={upgradePlan}
    />
{/if}

<!-- Add Toast component -->
<Toast 
    bind:show={showToast}
    message={toastMessage}
    type={toastType}
    duration={3000}
/>

<!-- ปรับปรุง EditLayoutModal ให้รองรับทั้งการสร้างและการแก้ไข -->
{#if showEditLayoutModal}
<EditLayoutModal
    bind:show={showEditLayoutModal}
    layout={isCreateMode ? null : selectedLayoutForEdit}
    index={isCreateMode ? -1 : selectedLayoutIndex}
    isCreateMode={isCreateMode}
    on:close={() => {
        showEditLayoutModal = false;
        isCreateMode = false;
        // รีเซ็ตข้อมูลหลังปิด Modal
        if (!isCreateMode) {
            selectedLayoutForEdit = { ...layouts[activeLayoutIndex] };
        }
    }}
    on:save={updateLayout}
    on:create={handleCreateLayout}
/>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
    }
    
    /* Add these new styles */
    .group:hover .group-hover\:visible {
        visibility: visible;
    }
    
    .group:hover .group-hover\:opacity-100 {
        opacity: 1;
    }

    /* Optional: Rotate the dropdown icon when open */
    .rotate-180 {
        transform: rotate(180deg);
    }

    /* Add border indication for edit mode */
    .edit-mode-background {
        border: 2px dashed #1E90FF; /* DodgerBlue color */
    }
</style>
