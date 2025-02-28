<script>
    import { createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import Select from "../common/Select.svelte";
    import Input from "../common/Input.svelte";
    import Button from "../common/Button.svelte";
    import TradeOptionSelect from "./TradeOptionSelect.svelte";
    import { validateTradeForm } from "$lib/utils/validators";
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { goto } from '$app/navigation';
    import { tradeDate } from '$lib/stores/tradeDateStore';
    import { api } from "$lib/utils/api";
    import { tradeTagStore, loadTags, addTag, deleteTag, updateTagUsage } from '$lib/stores/tradeTagStore';
    import { onMount, onDestroy } from 'svelte';
    import Modal from '../common/Modal.svelte';
    import LimitReachedModal from '../common/LimitReachedModal.svelte';
    import { Editor } from '@tiptap/core';
    import StarterKit from '@tiptap/starter-kit';
    import Link from '@tiptap/extension-link';
    import Underline from '@tiptap/extension-underline';
    import TextAlign from '@tiptap/extension-text-align';
    import Highlight from '@tiptap/extension-highlight';
    import Color from '@tiptap/extension-color';
    import TextStyle from '@tiptap/extension-text-style';
    import Image from '@tiptap/extension-image';
    import TradeTagHistoryModal from './TradeTagHistoryModal.svelte';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trade = null;
    export let accountId = null;

    let editMode = !!trade;
    let errors = {};
    let previousSymbol = "";
    let initialFormData = null;
    let isInitialized = false;

    let selectedTag = '';

    const defaultForm = {
        entryDate: getCurrentDateTime(),
        exitDate: getCurrentDateTime(),
        symbol: "",
        status: "OPEN",
        side: "LONG",
        quantity: "",
        amount: "",
        entryPrice: "",
        exitPrice: "",
        pnl: "",
        entryReason: "",
        exitReason: "",
        strategy: "",
        emotions: "neutral",
        notes: "",
        url: "",
        confidenceLevel: 1,
        greedLevel: 1,
        hasStopLoss: false,
        hasTakeProfit: false,
        favorite: false,
        leverage: 1,
        tags: [],
    };

    let form = { ...defaultForm };

    const emotionOptions = [
        { value: "neutral", label: "😐 Neutral" },
        { value: "confident", label: "😊 Confident" },
        { value: "fearful", label: "😨 Fearful" },
        { value: "angry", label: "😡 Angry" },
        { value: "disappointed", label: "😔 Disappointed" },
        { value: "uncertain", label: "🤔 Uncertain" },
        { value: "calm", label: "😌 Calm" },
        { value: "frustrated", label: "😤 Frustrated" },
        { value: "excited", label: "🤩 Excited" },
        { value: "anxious", label: "😰 Anxious" },
    ];

    function getCurrentDate() {
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        return now.toISOString().slice(0, 10);
    }

    function getCurrentDateTime() {
        const now = new Date();
        now.setSeconds(0, 0);
        return now.toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
    }

    function formatDateTimeLocal(dateInput) {
        let date;
        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
            date = new Date(dateInput);
        } else {
            date = new Date();
        }

        if (isNaN(date.getTime())) {
            date = new Date();
        }

        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0,16);
    }

    function resetForm() {
        if (editor) {
            editor.destroy();
            editor = null;
        }
        initialFormData = null;
        form = { ...defaultForm };
        errors = {};
        previousSymbol = "";
    }

    $: if (show && !isInitialized) {
        isInitialized = true;
        editMode = !!trade;
        if (trade) {
            initialFormData = {
                ...defaultForm,
                ...trade,
                entryDate: trade.entryDate 
                    ? formatDateTimeLocal(trade.entryDate)
                    : getCurrentDateTime(),
                exitDate: trade.exitDate
                    ? formatDateTimeLocal(trade.exitDate)
                    : getCurrentDateTime(),
                tags: trade.tags || [],
                type: trade.type || 'MANUAL',
                notes: trade.notes || ''
            };
            form = { ...initialFormData };
            if (editor) {
                editor.commands.setContent(form.notes || '');
            }
        } else {
            resetForm();
            if ($tradeDate) {
                form.entryDate = formatDateTimeLocal(new Date($tradeDate).setHours(7, 0, 0, 0));
                tradeDate.set(null);
            }
        }
    }

    $: if (form.status === "CLOSED" && !form.exitDate) {
        form.exitDate = getCurrentDateTime();
    }

    function calculatePnL() {
        if (!form.amount || form.amount <= 0) {
            errors.amount = "Amount must be greater than 0";
            return;
        }
        
        if (form.exitPrice && form.entryPrice) {
            const units = form.amount / form.entryPrice;
            if (form.side === "LONG") {
                form.pnl = (form.exitPrice - form.entryPrice) * units;
            } else {
                form.pnl = (form.entryPrice - form.exitPrice) * units;
            }
        }
    }

    // แยก validation rules ออกมาให้ชัดเจน
    const validationRules = {
        symbol: {
            required: true,
            message: "Symbol is required"
        },
        entryPrice: {
            required: true,
            min: 0,
            message: "Entry price must be greater than 0"
        },
        amount: {
            required: true,
            min: 0,
            message: "Amount must be greater than 0"
        },
        exitPrice: {
            required: (form) => form.status === "CLOSED",
            min: 0,
            message: "Exit price must be greater than 0"
        },
        pnl: {
            required: (form) => form.status === "CLOSED",
            message: "P&L is required for closed trades"
        }
    };

    // ปรับปรุงฟังก์ชัน validateForm
    function validateForm(form) {
        const errors = {};
        
        Object.entries(validationRules).forEach(([field, rules]) => {
            // ตรวจสอบว่าต้อง validate field นี้หรือไม่
            const shouldValidate = typeof rules.required === 'function' 
                ? rules.required(form) 
                : rules.required;

            if (!shouldValidate) return;

            // ตรวจสอบค่าว่าง
            if (!form[field] || form[field].toString().trim() === '') {
                errors[field] = rules.message;
                return;
            }

            // ตรวจสอบค่าต่ำสุด (ถ้ามี)
            if (rules.min !== undefined && Number(form[field]) <= rules.min) {
                errors[field] = rules.message;
            }
        });

        return errors;
    }

    let showLimitWarning = false;
    let showLimitError = false;
    let dailyTradeCount = 0;

    async function countDailyTrades(date) {
        if (!accountId) return 0;
        try {
            const allTrades = await api.getTrades(accountId);
            const targetDate = new Date(date).toISOString().split('T')[0];
            
            const count = allTrades.filter(trade => {
                if (trade.status !== "CLOSED") return false;
                const tradeExitDate = new Date(trade.exitDate).toISOString().split('T')[0];
                return tradeExitDate === targetDate;
            }).length;
            
            return count;
        } catch (error) {
            console.error('Error counting daily trades:', error);
            return 0;
        }
    }

    function prepareFormData(form) {
        const data = {
            ...form,
            entryDate: new Date(form.entryDate),
            exitDate: form.status === 'CLOSED' ? new Date(form.exitDate) : null,
            quantity: form.type === 'SYNC' ? form.quantity : null,
            amount: parseFloat(form.amount),
            entryPrice: parseFloat(form.entryPrice),
            exitPrice: form.status === 'CLOSED' ? parseFloat(form.exitPrice) : null,
            pnl: form.status === 'CLOSED' ? parseFloat(form.pnl) : null,
            notes: form.notes || ''
        };

        return data;
    }

    async function submitTrade() {
        try {
            const formData = prepareFormData(form);
            
            if (trade) {
                await api.updateTrade(trade._id, formData);
            } else {
                const payload = {
                    ...formData,
                    account: accountId,
                    type: 'MANUAL'
                };
                // console.log('Submitting trade payload:', payload);
                const result = await api.createTrade(payload);
                // console.log('API response:', result);
            }
            dispatch('tradeUpdated');
            
            // ส่ง global event ไปยัง window เพื่อให้ component อื่นๆ รับทราบ
            window.dispatchEvent(new CustomEvent('tradeupdate'));
            window.dispatchEvent(new CustomEvent('tradeupdated'));
            
            // รีเซ็ตค่าทั้งหมดก่อนปิด modal
            resetForm();
            trade = null;
            initialFormData = null;
            showLimitWarning = false;
            showLimitError = false;
            dailyTradeCount = 0;
            
            show = false;
        } catch (err) {
            console.error('Error submitting trade:', err);
            errors.submit = err.message || 'An unexpected error occurred';
        }
    }

    async function handleSubmit() {
        // Clear previous errors
        errors = {};
        
        // Client-side validation
        const validationErrors = validateForm(form);
        if (Object.keys(validationErrors).length > 0) {
            errors = validationErrors;
            return;
        }

        try {
            const tradeData = prepareFormData(form);

            if (editMode) {
                await api.updateTrade(trade._id, tradeData);
            } else {
                await api.createTrade({
                    ...tradeData,
                    account: accountId,
                    type: 'MANUAL'
                });
            }

            handleClose();
            dispatch('tradeUpdated');
            
            // ส่ง global event ไปยัง window เพื่อให้ component อื่นๆ รับทราบ
            window.dispatchEvent(new CustomEvent('tradeupdate'));
            window.dispatchEvent(new CustomEvent('tradeupdated'));
        } catch (error) {
            console.error('Error saving trade:', error);
            
            // แยก server validation errors ออกมาแสดงที่ footer
            if (error.message.includes('validation failed')) {
                const errorFields = [];
                Object.keys(validationRules).forEach(field => {
                    if (error.message.includes(`Path \`${field}\` is required`)) {
                        errorFields.push(field);
                    }
                });
                
                if (errorFields.length > 0) {
                    errors.server = `Required fields missing: ${errorFields.join(', ')}`;
                } else {
                    errors.server = 'Validation failed. Please check your input.';
                }
            } else {
                errors.server = error.message || 'An unexpected error occurred';
            }
        }
    }

    function handleClose() {
        if (editor) {
            editor.destroy();
            editor = null;
        }
        isInitialized = false;
        editMode = false; 
        activeTab = 'details'; // รีเซ็ตแท็บกลับไปที่ details
        trade = null;
        show = false;
        resetForm();
        dispatch('close');
    }

    const statusOptions = [
        { value: "OPEN", label: "Open" },
        { value: "CLOSED", label: "Closed" },
    ];

    const sideOptions = [
        { value: "LONG", label: "Long" },
        { value: "SHORT", label: "Short" },
    ];

    const levelOptions = Array.from({ length: 10 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }));

    $: subscriptionType = $subscriptionStore.type || SUBSCRIPTION_TYPES.BASIC;

    function upgradePlan() {
        goto('/subscription');
    }

    // TipTap editor setup
    let editor;
    let editorElement;
    
    $: if (show && editorElement && !editor) {
        initEditor();
    }
    
    function initEditor() {
        try {
            if (editor) {
                editor.destroy();
            }
            
            editor = new Editor({
                element: editorElement,
                extensions: [
                    StarterKit,
                    Link.configure({
                        openOnClick: false,
                    }),
                    Underline,
                    TextAlign.configure({
                        types: ['heading', 'paragraph'],
                    }),
                    Highlight,
                    TextStyle,
                    Color,
                    Image.configure({
                        inline: true,
                        allowBase64: true
                    })
                ],
                content: form.notes || '',
                editable: true,
                onUpdate: ({ editor }) => {
                    form.notes = editor.getHTML();
                }
            });
        } catch (error) {
            console.error('Error initializing editor:', error);
        }
    }
    
    onDestroy(() => {
        if (editor) {
            editor.destroy();
            editor = null;
        }
    });

    async function handleTagSelect(event) {
        const newTag = event.detail.value;
        if (!form.tags.includes(newTag)) {
            const existingTag = $tradeTagStore.tags.find(tag => tag.value === newTag);
            if (existingTag) {
                // Tag already exists, update its usage count
                try {
                    await updateTagUsage([existingTag._id]);
                    form.tags = [...form.tags, newTag];
                    // Inform user that tag already exists
                    alert(`Tag "${newTag}" already exists. Its usage count has been updated.`);
                } catch (error) {
                    console.error('Failed to update tag usage:', error);
                }
            } else {
                // Tag does not exist, add it
                try {
                    const tagData = await addTag(newTag);
                    await updateTagUsage([tagData._id]);
                    form.tags = [...form.tags, newTag];
                } catch (error) {
                    console.error('Failed to add tag:', error);
                    alert(`Failed to add tag "${newTag}". Please try again.`);
                }
            }
        }
    }

    async function removeTag(tag) {
        form.tags = form.tags.filter(t => t !== tag);
        try {
            const tagData = $tradeTagStore.tags.find(t => t.value === tag);
            if (tagData) {
                await updateTagUsage([tagData._id]);
                if (tagData.usageCount === 1) {
                    await deleteTag(tagData._id);
                }
            }
        } catch (error) {
            console.error('Failed to remove tag:', error);
        }
    }

    function getTagColor(tag) {
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
    }

    async function handleLimitWarningClose(shouldProceed) {
        showLimitWarning = false;
        if (shouldProceed) {
            await submitTrade();
        }
    }

    // เพิ่มฟังก์ชันป้องกันการ submit form
    function preventFormSubmit(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // เพิ่มตัวแปรสำหรับจัดการแท็บ
    let activeTab = 'details'; // 'details' หรือ 'journal'

    // เพิ่มการจัดการเมื่อเปลี่ยนแท็บ
    function handleTabChange(tab) {
        activeTab = tab;
        if (tab === 'journal' && editorElement && !editor) {
            // ให้เวลา DOM update ก่อนที่จะ initialize editor
            setTimeout(() => {
                initEditor();
            }, 0);
        }
    }

    // แก้ไขฟังก์ชันสำหรับแปลงค่าเป็นข้อความ
    function getLevelText(value) {
        return value.toString();
    }

    function isImageUrl(url) {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    }

    function handleImageError(event) {
        event.target.style.display = 'none';
    }

    // เพิ่มฟังก์ชันสำหรับแทรกรูปภาพ
    async function handleImageUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                try {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        editor?.chain().focus().setImage({ 
                            src: e.target.result,
                            alt: file.name 
                        }).run();
                    };
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Error uploading image:', error);
                }
            }
        };
        
        input.click();
    }

    // เพิ่มฟังก์ชันสำหรับนับ errors ในแต่ละ tab
    function countErrorsByTab(errors) {
        const detailsErrors = ['symbol', 'entryPrice', 'exitPrice', 'amount', 'pnl'].filter(field => errors[field]).length;
        const journalErrors = ['entryReason', 'exitReason', 'notes'].filter(field => errors[field]).length;
        
        return {
            details: detailsErrors,
            journal: journalErrors
        };
    }

    // Reactive statement เพื่อคำนวณจำนวน errors
    $: errorCounts = countErrorsByTab(errors);

    function validateNumberInput(e) {
        const value = e.target.value;
        
        // แยกส่วนจำนวนเต็มและทศนิยม
        const parts = value.split('.');
        const integerPart = parts[0];
        const decimalPart = parts[1] || '';

        // จำกัดจำนวนหลักก่อนทศนิยมไม่เกิน 10 หลัก
        if (integerPart.length > 10) {
            e.target.value = integerPart.slice(0, 10) + (decimalPart ? '.' + decimalPart : '');
        }
        
        // จำกัดทศนิยมไม่เกิน 10 ตำแหน่ง
        if (decimalPart.length > 10) {
            e.target.value = integerPart + '.' + decimalPart.slice(0, 10);
        }

        // ถ้าเป็นค่าลบ ให้นับเครื่องหมายลบด้วย
        if (value.startsWith('-')) {
            const numericPart = value.slice(1);
            const parts = numericPart.split('.');
            const integerPart = parts[0];
            const decimalPart = parts[1] || '';

            if (integerPart.length > 9) { // 9 เพราะต้องเผื่อเครื่องหมายลบ 1 ตำแหน่ง
                e.target.value = '-' + integerPart.slice(0, 9) + (decimalPart ? '.' + decimalPart : '');
            }
            if (decimalPart.length > 10) {
                e.target.value = '-' + integerPart + '.' + decimalPart.slice(0, 10);
            }
        }
    }

    function validateLeverage(e) {
        let value = e.target.value;
        
        // ลบทศนิยมออก
        value = value.replace(/\./g, '');
        
        // แปลงเป็นจำนวนเต็ม
        value = parseInt(value) || 1;
        
        // จำกัดให้ไม่เกิน 6 หลัก
        if (value.toString().length > 6) {
            value = parseInt(value.toString().slice(0, 6));
        }
        
        // จำกัดค่าต่ำสุดที่ 1
        if (value < 1) value = 1;
        
        e.target.value = value;
        form.leverage = value;
    }

    let showTagHistoryModal = false;
    let selectedTagForHistory = null;
    let selectedTagColor = null;

    function handleTagHistory(tag) {
        selectedTagForHistory = tag;
        selectedTagColor = getTagColor(tag);
        showTagHistoryModal = true;
    }

    function handleTagHistoryClose() {
        showTagHistoryModal = false;
        selectedTagForHistory = null;
        selectedTagColor = null;
    }

    function handleTradeView(event) {
        dispatch('view', event.detail);
    }

    function handleTradeEdit(event) {
        dispatch('edit', event.detail);
    }

    function handleTradeFavorite(event) {
        dispatch('favorite', event.detail);
    }

    function handleTradeDelete(event) {
        dispatch('delete', event.detail);
    }

    $: if (show) {
        loadTags();
    }
</script>

{#if show}
    <div
        class="fixed modal inset-0 bg-black/50 z-50 flex items-center justify-center p-2"
        transition:fade={{ duration: 150 }}>
        <div class="card w-full max-w-2xl mx-auto relative transform ease-out">
            <!-- Header -->
            <div
                class="px-6 py-4 bg-theme-500/10 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 rounded-t-xl z-10"
            >
                <div class="flex-1 flex items-center gap-3">
                    <!-- Trade Type Icon -->
                    {#if form.type === 'SYNC'}
                        <span class="text-theme-500" title="Synced trade">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </span>
                    {:else}
                        <span class="text-theme-500" title="Manual trade">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </span>
                    {/if}
                    <h2 class="text-lg font-bold text-light-text dark:text-dark-text">
                        {trade ? "Edit Trade" : "New Trade"}
                    </h2>
                    {#if form.symbol}
                        <div
                            class="text-base px-3 py-1 rounded-full bg-theme-500/10 text-theme-500 font-medium"
                        >
                            {form.symbol}
                        </div>
                    {/if}
                </div>
                <button
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                    on:click={handleClose}
                >
                    <svg 
                        class="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            stroke-linecap="round" 
                            stroke-linejoin="round" 
                            stroke-width="2" 
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Scrollable Content -->
            <div class="px-4 py-3 max-h-[calc(100vh-10rem)] overflow-y-auto">
                <!-- Tab Navigation -->
                <div class="flex border-b border-light-border dark:border-dark-hover mb-4">
                    <button
                        class="relative px-4 py-2 -mb-px text-sm font-medium {activeTab === 'details' ? 
                            'text-theme-500 border-b-2 border-theme-500' : 
                            'text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text'} 
                            {errorCounts.details > 0 ? 'error-tab' : ''}"
                        on:click={() => handleTabChange('details')}
                    >
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                            Trade Details
                        </div>
                        {#if errorCounts.details > 0}
                            <div class="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                                {errorCounts.details}
                            </div>
                        {/if}
                    </button>
                    <button
                        class="relative px-4 py-2 -mb-px text-sm font-medium {activeTab === 'journal' ? 
                            'text-theme-500 border-b-2 border-theme-500' : 
                            'text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text'}
                            {errorCounts.journal > 0 ? 'error-tab' : ''}"
                        on:click={() => handleTabChange('journal')}
                    >
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            Trade Journal
                        </div>
                        {#if errorCounts.journal > 0}
                            <div class="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                                {errorCounts.journal}
                            </div>
                        {/if}
                    </button>
                </div>

                <form on:submit|preventDefault={handleSubmit} class="space-y-2">
                    {#if activeTab === 'details'}
                        <!-- Trade Details Tab -->
                        <div class="space-y-4">
                            <!-- Symbol & Side -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                                        Symbol <span class="text-red-500">*</span>
                                </label>
                                <div class="input-wrapper">
                                    <TradeOptionSelect
                                        type="SYMBOL"
                                        bind:value={form.symbol}
                                        required
                                        placeholder="Select or add symbol"
                                        {accountId}
                                        disabled={form.type === 'SYNC'}
                                    />
                                </div>
                                {#if errors.symbol}
                                        <p class="mt-1 text-sm text-red-500">{errors.symbol}</p>
                                {/if}
                            </div>
                                <div>
                            <Select
                                label="Side"
                                options={sideOptions}
                                bind:value={form.side}
                                required
                                disabled={form.type === 'SYNC'}
                            />
                                    {#if errors.side}
                                        <p class="mt-1 text-sm text-red-500">{errors.side}</p>
                                    {/if}
                                </div>
                        </div>

                            <!-- Status & Strategy -->
                        <div class="grid grid-cols-2 gap-4">
                            <Select
                                label="Status"
                                options={statusOptions}
                                bind:value={form.status}
                                required
                                disabled={form.type === 'SYNC'}
                            />
                            <div>
                                    <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                                    Strategy
                                </label>
                                <div class="input-wrapper">
                                    <TradeOptionSelect
                                        type="STRATEGY"
                                        bind:value={form.strategy}
                                        placeholder="Select or add strategy"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                        <!-- Entry & Exit Dates -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label="Entry Date"
                                    type="datetime-local"
                                    bind:value={form.entryDate}
                                    max={new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16)}
                                    required
                                    error={errors.entryDate}
                                    disabled={form.type === 'SYNC'}
                                />
                                {#if errors.entryDate}
                                    <p class="mt-1 text-sm text-red-500">{errors.entryDate}</p>
                                {/if}
                            </div>
                                {#if form.status === "CLOSED"}
                                <div>
                                    <Input
                                        label="Exit Date"
                                        type="datetime-local"
                                        bind:value={form.exitDate}
                                        max={new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16)}
                                        required
                                        error={errors.exitDate}
                                        disabled={form.type === 'SYNC'}
                                    />
                                    {#if errors.exitDate}
                                        <p class="mt-1 text-sm text-red-500">{errors.exitDate}</p>
                                {/if}
                                </div>
                                    {/if}
                            </div>

                        <!-- Prices & Amount -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label="Entry Price"
                                    type="number"
                                    className="no-spinners"
                                    bind:value={form.entryPrice}
                                    required
                                    placeholder="0.00"
                                    disabled={form.type === 'SYNC'}
                                    on:input={(e) => validateNumberInput(e)}
                                />
                                {#if errors.entryPrice}
                                    <p class="mt-1 text-sm text-red-500">{errors.entryPrice}</p>
                                {/if}
                            </div>
                                {#if form.status === "CLOSED"}
                                <div>
                                    <Input
                                        label="Exit Price"
                                        type="number"
                                        className="no-spinners"
                                        bind:value={form.exitPrice}
                                        required
                                        placeholder="0.00"
                                        disabled={form.type === 'SYNC'}
                                        on:input={(e) => validateNumberInput(e)}
                                    />
                                    {#if errors.exitPrice}
                                        <p class="mt-1 text-sm text-red-500">{errors.exitPrice}</p>
                                {/if}
                                </div>
                            {/if}
                        </div>

                        <!-- Amount & PNL -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label="Amount (USD)"
                                    type="number"
                                    className="no-spinners"
                                    bind:value={form.amount}
                                    required
                                    placeholder="0.00"
                                    disabled={form.type === 'SYNC'}
                                    on:input={(e) => validateNumberInput(e)}
                                />
                                {#if errors.amount}
                                    <p class="mt-1 text-sm text-red-500">{errors.amount}</p>
                                {/if}
                            </div>
                                {#if form.status === "CLOSED"}
                                    <div class="flex items-end gap-2">
                                    <div class="flex-1">
                                        <Input
                                            label="P&L"
                                            type="number"
                                            className="no-spinners"
                                            bind:value={form.pnl}
                                            required
                                            placeholder="0.00"
                                            disabled={form.type === 'SYNC'}
                                            on:input={(e) => validateNumberInput(e)}
                                        />
                                        {#if errors.pnl}
                                            <p class="mt-1 text-sm text-red-500">{errors.pnl}</p>
                                        {/if}
                                    </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            class="h-[42px] flex items-center justify-center px-3"
                                            on:click={calculatePnL}
                                            disabled={form.type === 'SYNC'}
                                        >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                            </svg>
                                        </Button>
                                    </div>
                                {/if}
                    </div>

                        <!-- Risk Management -->
                        <div class="grid grid-cols-2 gap-4">
                            <Input
                                label="Leverage"
                                type="number"
                                step="1"
                                min="1"
                                bind:value={form.leverage}
                                placeholder="1"
                                error={errors.leverage}
                                disabled={form.type === 'SYNC'}
                                maxlength="6"
                                on:input={(e) => validateLeverage(e)}
                            />
                            <div class="flex items-center gap-4 mt-6">
                                <label class="flex items-center gap-1.5 p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer group select-none">
                                <input
                                    type="checkbox"
                                    bind:checked={form.hasStopLoss}
                                    class="checkbox"
                                />
                                    <span class="text-sm text-light-text-muted dark:text-dark-text-muted group-hover:text-light-text dark:group-hover:text-dark-text">
                                    Has Stop Loss
                                </span>
                            </label>
                                <label class="flex items-center gap-1.5 p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer group select-none">
                                <input
                                    type="checkbox"
                                    bind:checked={form.hasTakeProfit}
                                    class="checkbox"
                                />
                                    <span class="text-sm text-light-text-muted dark:text-dark-text-muted group-hover:text-light-text dark:group-hover:text-dark-text">
                                    Has Take Profit
                                </span>
                            </label>
                        </div>
                        </div>
                    {:else}
                        <!-- Trade Journal Tab -->
                        <div class="space-y-4">
                            <!-- Entry & Exit Reasons -->
                            <div class="space-y-4">
                                <div>
                                    <div class="flex justify-between items-center mb-1">
                                        <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                            Entry Reason
                                        </label>
                                        <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                            {form.entryReason?.length || 0}/200
                                        </span>
                                    </div>
                                    <textarea
                                        bind:value={form.entryReason}
                                        rows="3"
                                        maxlength="200"
                                        class="w-full px-2.5 py-1.5 text-sm rounded-md border border-light-border dark:border-0 bg-light-bg dark:bg-dark-bg resize-none"
                                        placeholder="Why did you enter this trade?"
                                    ></textarea>
                                </div>

                                {#if form.status === "CLOSED"}
                                    <div>
                                        <div class="flex justify-between items-center mb-1">
                                            <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                                Exit Reason
                                            </label>
                                            <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                                {form.exitReason?.length || 0}/200
                                            </span>
                                        </div>
                                        <textarea
                                            bind:value={form.exitReason}
                                            rows="3"
                                            maxlength="200"
                                            class="w-full px-2.5 py-1.5 text-sm rounded-md border border-light-border dark:border-0 bg-light-bg dark:bg-dark-bg resize-none"
                                            placeholder="Why did you exit this trade?"
                                        ></textarea>
                                    </div>
                                {/if}
                            </div>

                            <!-- Confidence & Greed Levels -->
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                        Confidence Level
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <div class="relative flex-1">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                bind:value={form.confidenceLevel}
                                                class="w-full h-1 bg-light-border dark:bg-dark-hover rounded-lg appearance-none cursor-pointer
                                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-theme-500
                                                    [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
                                                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-theme-500"
                                            />
                                        </div>
                                        <div class="px-2 py-0.5 text-xs rounded-full bg-theme-500/10 text-theme-500 min-w-[2rem] text-center">
                                            {getLevelText(form.confidenceLevel)}
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-1">
                                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                        Greed Level
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <div class="relative flex-1">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                bind:value={form.greedLevel}
                                                class="w-full h-1 bg-light-border dark:bg-dark-hover rounded-lg appearance-none cursor-pointer
                                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-theme-500
                                                    [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
                                                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-theme-500"
                                            />
                                        </div>
                                        <div class="px-2 py-0.5 text-xs rounded-full bg-theme-500/10 text-theme-500 min-w-[2rem] text-center">
                                            {getLevelText(form.greedLevel)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Emotions & Tags -->
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                        Emotions
                                    </label>
                                    <Select
                                        options={emotionOptions}
                                        bind:value={form.emotions}
                                        placeholder="How did you feel during this trade?"
                                    />
                                </div>
                                <div class="space-y-1">
                                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                        Tags ({form.tags.length}/7)
                                    </label>
                                    <div class="space-y-2">
                                        <TradeOptionSelect
                                            type="TAG"
                                            placeholder="Add tags..."
                                            bind:value={selectedTag}
                                            options={$tradeTagStore.tags}
                                            on:change={handleTagSelect}
                                            loading={$tradeTagStore.loading}
                                            error={$tradeTagStore.error}
                                        />
                                        
                                        {#if form.tags.length > 0}
                                            <div class="flex flex-wrap gap-2 mt-2">
                                                {#each form.tags as tag}
                                                    {@const tagData = $tradeTagStore.tags.find(t => t.value === tag)}
                                                    {@const tagColor = getTagColor(tag)}
                                                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full {tagColor.bg} {tagColor.text} text-sm">
                                                        <span class="font-medium">{tag}</span>
                                                        <span class="text-xs opacity-75 font-normal">({tagData?.usageCount || 0})</span>
                                                        <button
                                                            type="button"
                                                            class="hover:opacity-75"
                                                            on:click={() => removeTag(tag)}
                                                        >
                                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>

                            <!-- Notes -->
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <label for="notes" class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                        Notes
                                    </label>
                                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                        {form.notes.length}/1000
                                    </span>
                                </div>
                                <div class="editor-container">
                                    <div class="editor-menu border border-light-border dark:border-dark-hover rounded-t-md bg-light-bg dark:bg-dark-hover p-1 flex flex-wrap gap-1">
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('bold') ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleBold().run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h8a4 4 0 100-8H6v8zm0 0h8a4 4 0 110 8H6v-8z"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('italic') ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleItalic().run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4h-8"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('underline') ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleUnderline().run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 16h14M8 4v4m4-4v4m4-4v4"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('highlight') ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleHighlight().run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive({ textAlign: 'left' }) ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().setTextAlign('left').run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h10M4 18h16"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive({ textAlign: 'center' }) ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().setTextAlign('center').run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M7 12h10M4 18h16"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive({ textAlign: 'right' }) ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().setTextAlign('right').run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M10 12h10M4 18h16"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('bulletList') ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleBulletList().run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('orderedList') ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleOrderedList().run()}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h10M7 16h10M3 8h.01M3 12h.01M3 16h.01"/>
                                            </svg>
                                        </button>
                                        <button 
                                            type="button"
                                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('link') ? 'bg-theme-500/10' : ''}" 
                                            on:click|preventDefault|stopPropagation={() => {
                                                const url = window.prompt('URL:');
                                                if (url) {
                                                    editor?.chain().focus().setLink({ href: url }).run();
                                                } else if (editor?.isActive('link')) {
                                                    editor?.chain().focus().unsetLink().run();
                                                }
                                            }}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                                            </svg>
                                        </button>
                                        <div class="relative">
                                            <input 
                                                type="color" 
                                                class="absolute opacity-0 w-full h-full cursor-pointer" 
                                                on:input|preventDefault|stopPropagation={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                                            />
                                            <button 
                                                type="button"
                                                class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover" 
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v14a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                                                </svg>
                                            </div>
                                            <div class="w-px h-6 bg-light-border dark:bg-dark-hover mx-1"></div>
                                            <button 
                                                type="button"
                                                class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover"
                                                on:click={handleImageUpload}
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div 
                                        bind:this={editorElement}
                                        class="border border-light-border dark:border-dark-hover rounded-b-md bg-light-bg dark:bg-dark-bg p-2 min-h-[100px]"
                                        data-placeholder="Write your trade notes here..."
                                    ></div>
                                </div>
                            </div>

                            <div class="space-y-1">
                                <div class="flex justify-between items-center">
                                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                        URL
                                    </label>
                                </div>
                                <div class="space-y-2">
                                    <input
                                        type="url"
                                        bind:value={form.url}
                                        maxlength="200"
                                        class="w-full px-2.5 py-1.5 h-8 text-sm rounded-md border border-light-border dark:border-dark-hover bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text"
                                        placeholder="Enter a URL (e.g., TradingView chart, image, etc.)"
                                    />
                                    {#if form.url && isImageUrl(form.url)}
                                        <div class="rounded-lg overflow-hidden border border-light-border dark:border-dark-hover">
                                            <img
                                                src={form.url}
                                                alt="Trade Reference"
                                                class="w-full max-h-48 object-contain bg-light-hover dark:bg-dark-hover"
                                                on:error={handleImageError}
                                            />
                                        </div>
                                    {/if}
                                </div>
                                {#if errors.url}
                                    <p class="text-sm text-red-500">{errors.url}</p>
                                {/if}
                            </div>
                    {/if}
                </form>
            </div>

            <!-- Footer -->
            <div
                class="px-4 py-2 border-t border-light-border dark:border-0 flex justify-between gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10"
            >
                <div class="flex-1">
                    {#if form.type === 'SYNC'}
                        <div class="flex items-center gap-2 text-light-text-muted dark:text-dark-text-muted">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span class="text-sm">
                                This is a synced trade. Core trade data cannot be modified.
                            </span>
                        </div>
                    {/if}
                    <!-- Server Validation Error Message -->
                    {#if errors.server}
                        <div class="flex items-center gap-2 text-red-500">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span class="text-sm font-medium">{errors.server}</span>
                        </div>
                    {/if}
                </div>
                <div class="flex gap-4">
                    <Button type="button" variant="secondary" size="sm" on:click={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm" 
                        on:click={handleSubmit}
                        class="min-w-[100px]"
                    >
                        Save Trade
                    </Button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Warning Modal (3 trades) -->
{#if showLimitWarning}
    <LimitReachedModal
        show={showLimitWarning}
        title="Daily Trade Limit"
        description="You've used 3 of 4 daily trades. You can delete existing trades to add new ones, or upgrade to Pro for unlimited trading."
        upgradeText="Upgrade to Pro"
        cancelText="Cancel"
        width="md"
        on:close={() => handleLimitWarningClose(false)}
        on:continue={() => handleLimitWarningClose(true)}
        on:upgrade={upgradePlan}
    />
{/if}

<!-- Error Modal (4 trades) -->
{#if showLimitError}
    <LimitReachedModal
        show={showLimitError}
        title="Trade Limit Reached"
        description="Daily limit reached (4/4). Delete existing trades to add new ones, or upgrade to Pro for unlimited trading."
        upgradeText="Upgrade to Pro"
        cancelText="Close"
        width="md"
        on:close={() => showLimitError = false}
        on:upgrade={upgradePlan}
    />
{/if}

<TradeTagHistoryModal
    bind:show={showTagHistoryModal}
    tag={selectedTagForHistory}
    tagColor={selectedTagColor}
    {accountId}
    on:close={handleTagHistoryClose}
    on:view={handleTradeView}
    on:edit={handleTradeEdit}
    on:favorite={handleTradeFavorite}
    on:delete={handleTradeDelete}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }

    .input-wrapper :global(input),
    .input-wrapper :global(.input) {
        @apply bg-light-bg dark:bg-dark-bg;
    }

    .input-wrapper :global(.input.error) {
        @apply border-red-500 focus:ring-red-500;
    }

    .input-wrapper :global(.input.success) {
        @apply border-green-500 focus:ring-green-500;
    }

    .input {
        @apply w-full px-2.5 py-1.5 text-sm rounded-md;
    }
    
    /* Hide number input spinners for decimal inputs */
    input[type="number"].no-spinners::-webkit-outer-spin-button,
    input[type="number"].no-spinners::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    
    input[type="number"].no-spinners {
        -moz-appearance: textfield;
    }
    
    /* Override global input styles */

    .upgrade-button {
        @apply px-3 py-1.5 rounded-full text-sm font-medium
        bg-gradient-to-r from-theme-500 to-theme-600
        text-white shadow-sm
        transition-all duration-200
        hover:shadow-md hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-theme-500 focus:ring-offset-2
        dark:focus:ring-offset-dark-card;
    }

    .upgrade-button-section {
        @apply px-3 py-1 rounded-full text-sm font-medium
        bg-gradient-to-r from-theme-500/10 to-theme-600/10
        text-theme-500
        transition-all duration-200
        hover:from-theme-500 hover:to-theme-600 hover:text-white
        focus:outline-none focus:ring-2 focus:ring-theme-500/50;
    }

    /* Animation keyframes */
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }

    .upgrade-button {
        animation: pulse 2s infinite;
    }

    .upgrade-button:hover {
        animation: none;
    }

    /* Quill editor styles */
    :global(.ql-toolbar) {
        @apply bg-light-bg dark:bg-dark-hover border-light-border dark:border-dark-hover rounded-t-md !important;
    }
    
    :global(.ql-container) {
        @apply bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-hover rounded-b-md !important;
        min-height: 100px;
    }
    
    :global(.ql-editor) {
        @apply text-light-text dark:text-dark-text !important;
        min-height: 100px;
    }
    
    :global(.ql-snow .ql-stroke) {
        @apply stroke-light-text-muted dark:stroke-dark-text-muted !important;
    }
    
    :global(.ql-snow .ql-fill) {
        @apply fill-light-text-muted dark:fill-dark-text-muted !important;
    }
    
    :global(.ql-snow .ql-picker) {
        @apply text-light-text-muted dark:text-dark-text-muted !important;
    }
    
    :global(.ql-snow.ql-toolbar button:hover),
    :global(.ql-snow .ql-toolbar button:hover) {
        @apply bg-light-hover dark:bg-dark-hover !important;
    }
    
    :global(.ql-snow.ql-toolbar button.ql-active),
    :global(.ql-snow .ql-toolbar button.ql-active) {
        @apply bg-theme-500/10 !important;
    }

    .editor-container {
        @apply text-light-text dark:text-dark-text;
    }
    
    :global(.ProseMirror) {
        @apply outline-none min-h-[100px] p-2;
    }
    
    :global(.ProseMirror p) {
        @apply mb-1;
    }
    
    :global(.ProseMirror ul),
    :global(.ProseMirror ol) {
        @apply pl-5;
    }
    
    :global(.ProseMirror ul) {
        @apply list-disc;
    }
    
    :global(.ProseMirror ol) {
        @apply list-decimal;
    }

    :global(.ProseMirror p.is-editor-empty:first-child::before) {
        content: attr(data-placeholder);
        float: left;
        color: #adb5bd;
        pointer-events: none;
        height: 0;
    }

    textarea {
        @apply focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent
        dark:focus:ring-offset-dark-card dark:placeholder-dark-text-muted/50;
    }
    
    /* สำหรับ Firefox */
    textarea {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }
    
    /* สำหรับ Chrome, Safari และ Edge */
    textarea::-webkit-scrollbar {
        width: 4px;
    }
    
    textarea::-webkit-scrollbar-track {
        background: transparent;
    }
    
    textarea::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 2px;
    }

    /* เพิ่ม styles สำหรับรูปภาพ */
    :global(.ProseMirror img) {
        @apply max-w-full h-auto rounded-lg;
        max-height: 400px;
        object-fit: contain;
    }

    :global(.ProseMirror .image-container) {
        @apply my-2 flex justify-center;
    }

    /* เพิ่ม style สำหรับ error tab */
    .error-tab {
        @apply rounded-t-lg relative;
    }

    .error-tab::before {
        content: '';
        @apply absolute inset-0 rounded-t-lg pointer-events-none;
        border-width: 3px 3px 0 3px;
        border-style: solid;
        border-color: rgb(239 68 68 / 0.7);
    }

    /* เพิ่ม border-bottom เมื่อ tab ไม่ active */
    button:not(.border-theme-500).error-tab::before {
        border-bottom-width: 3px;
    }
</style>