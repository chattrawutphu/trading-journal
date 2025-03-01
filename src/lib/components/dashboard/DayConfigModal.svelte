<script>
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import Modal from '../common/Modal.svelte';
    import DayTagSelect from "./DayTagSelect.svelte";
    import { dayConfigStore } from '$lib/stores/dayConfigStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { goto } from '$app/navigation';
    import { dayTagStore } from '$lib/stores/dayTagStore';
    import { api } from '$lib/utils/api';
    import { Editor } from '@tiptap/core';
    import StarterKit from '@tiptap/starter-kit';
    import Link from '@tiptap/extension-link';
    import Underline from '@tiptap/extension-underline';
    import TextAlign from '@tiptap/extension-text-align';
    import Highlight from '@tiptap/extension-highlight';
    import Color from '@tiptap/extension-color';
    import TextStyle from '@tiptap/extension-text-style';
    import Image from '@tiptap/extension-image';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let accountId;
    export let date;
    export let config = null;

    let editor;
    let editorElement;

    let formState = {
        note: '',
        tags: [],
        favorite: false
    };

    let error = null;
    let isSubmitting = false;
    let loading = false;

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
                content: formState.note || '',
                editable: true,
                onUpdate: ({ editor }) => {
                    formState.note = editor.getHTML();
                }
            });
        } catch (error) {
            console.error('Error initializing editor:', error);
        }
    }

    function resetForm() {
        formState = {
            note: config?.note || '',
            tags: config?.tags || [],
            favorite: config?.favorite || false
        };
        if (editor) {
            editor.commands.setContent(formState.note || '');
        }
    }

    $: if (show || config) {
        resetForm();
    }

    function handleClose() {
        if (editor) {
            editor.destroy();
            editor = null;
        }
        show = false;
        resetForm();
        dispatch('close');
    }

    async function removeTag(tag) {
        try {
            // ลบ tag ออกจาก formState
            formState.tags = formState.tags.filter(t => t !== tag);

            // หา tag ID จาก dayTagStore
            const tagToUpdate = $dayTagStore.tags.find(t => t.value === tag);
            if (tagToUpdate) {
                // อัพเดทจำนวนการใช้งานของ tag ที่ถูกลบ
                await api.updateDayTagUsage([tagToUpdate._id]);
                await dayTagStore.loadTags(); // โหลด tags ใหม่เพื่ออัพเดทจำนวนการใช้งาน
            }
        } catch (error) {
            console.error('Failed to update tag usage count:', error);
        }
    }

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

    async function handleSubmit() {
        if (isSubmitting) return;
        
        try {
            isSubmitting = true;
            error = null;

            // เก็บ tags เดิมไว้เพื่อเปรียบเทียบ
            const originalTags = config?.tags || [];

            const data = {
                account: accountId,
                date,
                note: formState.note,
                tags: formState.tags,
                favorite: formState.favorite
            };

            let updatedConfig;
            if (config) {
                updatedConfig = await api.updateDayConfig(accountId, date, data);
            } else {
                updatedConfig = await api.createDayConfig(data);
            }

            // หา tags ที่ต้องอัพเดทจำนวนการใช้งาน (ทั้งที่เพิ่มและลบ)
            const allAffectedTags = [...new Set([...originalTags, ...formState.tags])];
            const tagIdsToUpdate = $dayTagStore.tags
                .filter(tag => allAffectedTags.includes(tag.value))
                .map(tag => tag._id);

            if (tagIdsToUpdate.length > 0) {
                await api.updateDayTagUsage(tagIdsToUpdate);
                await dayTagStore.loadTags();
            }

            dispatch('configUpdated', updatedConfig);
            handleClose();
        } catch (err) {
            error = err.message;
            console.error('Error saving day config:', err);
        } finally {
            isSubmitting = false;
        }
    }

    async function handleTagSelect(event) {
        const tagValue = event.detail.value;
        if (!tagValue || typeof tagValue !== 'string') return;
        
        const maxTags = 7;
        
        if (formState.tags.length < maxTags && !formState.tags.includes(tagValue)) {
            try {
                // ตรวจสอบว่า tag มีอยู่แล้วหรือไม่
                const existingTag = $dayTagStore.tags.find(t => t.value === tagValue);
                if (!existingTag) {
                    await dayTagStore.addTag(tagValue);
                }
                formState.tags = [...formState.tags, tagValue];
            } catch (error) {
                console.error('Failed to add tag:', error);
            }
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

    function upgradePlan() {
        goto('/subscription');
    }

    $: subscriptionType = $subscriptionStore.type || SUBSCRIPTION_TYPES.BASIC;

    function handleNoteInput(event) {
        const maxLength = 1000;
        if (event.target.value.length > maxLength) {
            formState.note = event.target.value.slice(0, maxLength);
        }
    }

    // เพิ่มฟังก์ชันสำหรับดึงจำนวนการใช้งานของ tag
    function getTagUsageCount(tagValue) {
        const tag = $dayTagStore.tags.find(t => t.value === tagValue);
        return tag ? tag.usageCount : 0;
    }

    onMount(() => {
        // โหลด day tags เมื่อ component ถูกโหลด
        dayTagStore.loadTags();
    });

    // Initialize editor when showing modal
    $: if (show && editorElement && !editor) {
        initEditor();
    }

    // เพิ่มฟังก์ชัน cleanup
    onDestroy(() => {
        if (editor) {
            editor.destroy();
            editor = null;
        }
    });
</script>

{#if show}
    <Modal 
        {show} 
        on:close={handleClose}
        width="w-full max-w-2xl"
    >
        <svelte:fragment slot="title">
            <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-theme-500/10">
                    <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">
                        Day Configuration
                    </h2>
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>
            </div>
        </svelte:fragment>
        <form 
            class="p-4 space-y-4" 
            on:submit|preventDefault={handleSubmit}
            on:click|stopPropagation
        >
            <!-- Note Section -->
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label for="note" class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                        Notes
                    </label>
                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                        {formState.note.length}/1000
                    </span>
                </div>
                <div class="editor-container">
                    <div class="editor-menu border border-light-border dark:border-dark-hover rounded-t-md bg-light-bg dark:bg-dark-hover p-1 flex flex-wrap gap-1">
                        <!-- Text Style -->
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

                        <!-- Divider -->
                        <div class="w-px h-6 bg-light-border dark:bg-dark-hover mx-1"></div>

                        <!-- Text Align -->
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

                        <!-- Divider -->
                        <div class="w-px h-6 bg-light-border dark:bg-dark-hover mx-1"></div>

                        <!-- Lists -->
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

                        <!-- Link -->
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

                        <!-- Color Picker -->
                        <div class="relative">
                            <input 
                                type="color" 
                                class="absolute opacity-0 w-full h-full cursor-pointer" 
                                on:input|preventDefault|stopPropagation={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                            />
                            <button 
                                type="button"
                                class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover"
                                on:click|preventDefault|stopPropagation={() => editor?.chain().focus().setColor(getTagColor(formState.tags[0]).text).run()}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                                </svg>
                            </button>
                        </div>

                        <!-- Divider -->
                        <div class="w-px h-6 bg-light-border dark:bg-dark-hover mx-1"></div>

                        <!-- Image Upload -->
                        <button 
                            type="button"
                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover"
                            on:click={handleImageUpload}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                        </button>
                    </div>
                    <div 
                        bind:this={editorElement}
                        class="border border-light-border dark:border-dark-hover rounded-b-md bg-light-bg dark:bg-dark-bg p-2 min-h-[200px]"
                        data-placeholder="Add notes for this trading day..."
                    ></div>
                </div>
            </div>

            <!-- Tags Section -->
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                        Day Tags ({formState.tags.length}/7)
                    </label>
                </div>
                <div class="space-y-2">
                    <DayTagSelect
                        type="TAG"
                        placeholder="Add tags..."
                        value=""
                        on:change={handleTagSelect}
                        loading={$dayTagStore.loading}
                        error={$dayTagStore.error}
                    />
                    
                    {#if formState.tags.length > 0}
                        <div class="flex flex-wrap gap-2 mt-2">
                            {#each formState.tags as tag}
                                {@const tagColor = getTagColor(tag)}
                                <div class="flex items-center gap-1 px-2 py-1 rounded-full {tagColor.bg} {tagColor.text} text-sm">
                                    <span>{tag}</span>
                                    <span class="ml-1 text-xs opacity-75">
                                        ({getTagUsageCount(tag)})
                                    </span>
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

            <!-- Favorite Toggle -->
            <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        bind:checked={formState.favorite}
                        class="checkbox"
                    />
                    <span class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        Mark as favorite
                    </span>
                </label>
            </div>

            {#if error}
                <p class="text-sm text-red-500">{error}</p>
            {/if}

            <!-- Footer -->
            <div class="flex justify-end gap-4 pt-4 border-t border-light-border dark:border-dark-border">
                <Button type="button" variant="secondary" on:click={handleClose}>
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    variant="primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </form>
    </Modal>
{/if}

<style lang="postcss">
    .upgrade-button-section {
        @apply px-3 py-1 rounded-full text-sm font-medium
        bg-gradient-to-r from-theme-500/10 to-theme-600/10
        text-theme-500
        transition-all duration-200
        hover:from-theme-500 hover:to-theme-600 hover:text-white
        focus:outline-none focus:ring-2 focus:ring-theme-500/50;
    }

    .editor-container {
        @apply text-light-text dark:text-dark-text;
    }
    
    :global(.ProseMirror) {
        @apply outline-none min-h-[200px] p-2;
    }
    
    :global(.ProseMirror p) {
        @apply mb-1;
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
</style> 