<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import Button from '$lib/components/common/Button.svelte';
    import { fade } from 'svelte/transition';
    
    export let show = false;
    export let layout = null; // เป็น null ในกรณีสร้างใหม่
    export let index = -1; // ใช้ค่า -1 สำหรับการสร้าง layout ใหม่
    export let isCreateMode = false; // เพิ่มตัวแปรเพื่อระบุว่าเป็นโหมดสร้างใหม่
    
    const dispatch = createEventDispatcher();
    
    // คัดลอกข้อมูลเพื่อไม่ให้กระทบข้อมูลเดิม
    let editedName = '';
    let editedIcon = 'dashboard';
    
    // รายการไอคอนทั้งหมดในกลุ่มเดียว (ไม่แบ่งหมวดหมู่)
    const allIcons = [
        'dashboard', 'chart', 'stats', 'trading', 
        'money', 'target', 'calendar', 'settings'
    ];
    
    // รายการไอคอนที่ให้เลือก
    const availableIcons = [
        { id: 'dashboard', path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { id: 'chart', path: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { id: 'trading', path: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
        { id: 'calendar', path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { id: 'target', path: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
        { id: 'money', path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'stats', path: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' },
        { id: 'settings', path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    ];

    // ฟังก์ชันในการแสดงตัวอย่างไอคอน
    function getIconById(id) {
        return availableIcons.find(icon => icon.id === id);
    }

    // ฟังก์ชันบันทึกการเปลี่ยนแปลง
    function handleSave() {
        if (isCreateMode) {
            // กรณีสร้าง Layout ใหม่
            dispatch('create', {
                name: editedName,
                icon: editedIcon,
                widgets: [] // เริ่มต้นด้วย Widget ว่างเปล่า
            });
        } else {
            // กรณีแก้ไข Layout ที่มีอยู่แล้ว
            dispatch('save', {
                index,
                layout: {
                    ...(layout || {}),
                    name: editedName,
                    icon: editedIcon
                }
            });
        }
        
        // ปิด Modal
        show = false;
    }
    
    // ฟังก์ชันปิด Modal
    function close() {
        show = false;
        dispatch('close');
    }

    // รีเซ็ตข้อมูลเมื่อ layout หรือ โหมดเปลี่ยน
    $: {
        if (show) {
            if (isCreateMode) {
                // ใช้ค่าเริ่มต้นในโหมดสร้างใหม่
                editedName = '';
                editedIcon = 'dashboard';
            } else if (layout) {
                // ใช้ค่าจาก layout ในโหมดแก้ไข
                editedName = layout.name || '';
                editedIcon = layout.icon || 'dashboard';
            }
        }
    }
</script>

{#if show}
    <div class="fixed modal inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
         transition:fade={{ duration: 150 }}>
        <div class="card w-full max-w-md mx-auto relative transform ease-out max-h-[80vh] flex flex-col">
            <!-- Header -->
            <div class="px-5 py-3 border-b border-light-border dark:border-0 flex justify-between items-center bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <div class="flex items-center gap-2">
                    <!-- Layout Icon Preview -->
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-theme-100 dark:bg-theme-900/40">
                        <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIconById(editedIcon)?.path || availableIcons[0].path} />
                        </svg>
                    </div>
                    <h2 class="text-base font-bold text-light-text dark:text-dark-text">
                        {isCreateMode ? 'Create New Layout' : 'Edit Layout'}
                    </h2>
                </div>
                <button class="p-1 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                        on:click={close}>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto">
                <div class="p-5">
                    <!-- Layout Name Input -->
                    <div class="mb-4">
                        <label for="layoutName" class="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
                            Layout Name
                        </label>
                        <div class="relative">
                            <input 
                                type="text" 
                                id="layoutName"
                                bind:value={editedName}
                                class="w-full px-3 py-2 text-sm rounded-lg bg-light-input dark:bg-dark-input 
                                       border border-light-border dark:border-dark-border
                                       focus:ring-2 focus:ring-theme-500 focus:border-transparent pr-8"
                                placeholder="Enter layout name"
                                autocomplete="off"
                            />
                            <div class="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Icon Selection -->
                    <div>
                        <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                            Select Icon
                        </label>
                        
                        <!-- แสดงไอคอนทั้งหมดเรียงชิดกัน -->
                        <div class="grid grid-cols-8 gap-1.5">
                            {#each allIcons as iconId}
                                {#each [getIconById(iconId)] as icon}
                                    {#if icon}
                                        <button 
                                            class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200
                                                   {editedIcon === iconId ? 
                                                     'bg-theme-100 dark:bg-theme-900/40 ring-2 ring-theme-500' : 
                                                     'bg-light-hover dark:bg-dark-hover hover:bg-theme-50 dark:hover:bg-theme-900/20'}"
                                            on:click={() => editedIcon = iconId}
                                        >
                                            <svg class="w-4.5 h-4.5 {editedIcon === iconId ? 'text-theme-500' : 'text-light-text-muted dark:text-dark-text-muted'}" 
                                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon.path} />
                                            </svg>
                                        </button>
                                    {/if}
                                {/each}
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="px-5 py-3 border-t border-light-border dark:border-0 flex justify-end items-center bg-light-card dark:bg-dark-card rounded-b-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <div class="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="xs"
                        on:click={close}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="primary"
                        size="xs"
                        disabled={!editedName.trim()}
                        on:click={handleSave}
                    >
                        {isCreateMode ? 'Create' : 'Save'}
                    </Button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }

    :global(.modal) {
        overscroll-behavior: contain;
    }
</style> 