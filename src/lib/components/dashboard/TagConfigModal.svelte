<script>
    import { createEventDispatcher, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import Modal from '../common/Modal.svelte';
    import { api } from '$lib/utils/api';
    import { dayTagStore } from '$lib/stores/dayTagStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
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
    export let tag = null;
    export let config = null;

    $: subscriptionType = $subscriptionStore.type || SUBSCRIPTION_TYPES.BASIC;

    let editor;
    let editorElement;

    let formState = {
        tagName: '',
        note: ''
    };

    let error = null;
    let isSubmitting = false;

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
            tagName: tag || '',
            note: config?.note || ''
        };
        if (editor) {
            editor.commands.setContent(formState.note || '');
        }
    }

    onDestroy(() => {
        if (editor) {
            editor.destroy();
            editor = null;
        }
    });

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

    async function handleSubmit() {
        if (isSubmitting) return;
        
        try {
            isSubmitting = true;
            error = null;

            const data = {
                note: formState.note
            };

            // ถ้ามีการเปลี่ยนแปลงชื่อ tag
            if (formState.tagName !== tag) {
                // ลบ tag เก่า
                const oldTag = $dayTagStore.tags.find(t => t.value === tag);
                if (oldTag) {
                    await api.deleteDayTag(oldTag._id);
                }
                
                // สร้าง tag ใหม่
                await dayTagStore.addTag(formState.tagName);
                
                // อัพเดท tag history สำหรับ tag ใหม่
                const updatedHistory = await api.updateTagHistory(formState.tagName, data);
                dispatch('configUpdated', updatedHistory);
                
                // รีโหลด tags
                await dayTagStore.loadTags();
            } else {
                // ถ้าไม่มีการเปลี่ยนชื่อ tag ให้อัพเดทแค่ note
                const updatedHistory = await api.updateTagHistory(tag, data);
                dispatch('configUpdated', updatedHistory);
            }

            handleClose();
        } catch (err) {
            error = err.message;
            console.error('Error saving tag history:', err);
        } finally {
            isSubmitting = false;
        }
    }

    // Initialize editor when showing modal
    $: if (show && editorElement && !editor) {
        initEditor();
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
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">
                        Tag Configuration
                    </h2>
                    {#if tag}
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        Editing tag: {tag}
                    </p>
                    {:else}
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        Create new tag
                    </p>
                    {/if}
                </div>
            </div>
        </svelte:fragment>
        <form 
            class="p-4 space-y-4" 
            on:submit|preventDefault={handleSubmit}
            on:click|stopPropagation
        >
            <!-- Tag Name Section -->
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label for="tagName" class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                        Tag Name
                    </label>
                </div>
                <input
                    id="tagName"
                    type="text"
                    bind:value={formState.tagName}
                    class="w-full px-3 py-2 text-sm rounded-md border border-light-border dark:border-0 
                           bg-light-bg dark:bg-dark-bg focus:ring-1 focus:ring-theme-500
                           focus:outline-none focus:border-theme-500"
                    placeholder="Enter tag name..."
                />
            </div>

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
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h8a4 4 0 100-8H6v8zm0 0h8a4 4 0 110 8H6v-8z"/>
                            </svg>
                        </button>
                        <button 
                            type="button"
                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('italic') ? 'bg-theme-500/10' : ''}" 
                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleItalic().run()}
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4h-8"/>
                            </svg>
                        </button>
                        <button 
                            type="button"
                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('underline') ? 'bg-theme-500/10' : ''}" 
                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleUnderline().run()}
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 16h14M8 4v4m4-4v4m4-4v4"/>
                            </svg>
                        </button>
                        <button 
                            type="button"
                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('highlight') ? 'bg-theme-500/10' : ''}" 
                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleHighlight().run()}
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
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
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h10M4 18h16"/>
                            </svg>
                        </button>
                        <button 
                            type="button"
                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive({ textAlign: 'center' }) ? 'bg-theme-500/10' : ''}" 
                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().setTextAlign('center').run()}
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M7 12h10M4 18h16"/>
                            </svg>
                        </button>
                        <button 
                            type="button"
                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive({ textAlign: 'right' }) ? 'bg-theme-500/10' : ''}" 
                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().setTextAlign('right').run()}
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
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
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </button>
                        <button 
                            type="button"
                            class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover {editor?.isActive('orderedList') ? 'bg-theme-500/10' : ''}" 
                            on:click|preventDefault|stopPropagation={() => editor?.chain().focus().toggleOrderedList().run()}
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
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
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
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
                                disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                            />
                            <button 
                                type="button"
                                class="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover" 
                                disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
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
                            on:click|preventDefault|stopPropagation={handleImageUpload}
                            disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                        </button>
                    </div>
                    <div 
                        bind:this={editorElement}
                        class="border border-light-border dark:border-dark-hover rounded-b-md bg-light-bg dark:bg-dark-bg p-2"
                        data-placeholder="Add notes for this tag..."
                    ></div>
                </div>
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
    :global(.input) {
        background-color: var(--bg-color) !important;
        color: var(--text-color) !important;
        border-color: var(--border-color) !important;
    }

    :global(.input[disabled]) {
        cursor: not-allowed;
    }

    .editor-container {
        @apply text-light-text dark:text-dark-text;
        min-height: 200px;
    }
    
    :global(.ProseMirror) {
        @apply outline-none p-2;
        min-height: 200px;
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
        font-style: italic;
    }

    /* Rich text content styles */
    :global(.rich-text-content p) {
        @apply mb-2;
    }
    
    :global(.rich-text-content ul) {
        @apply list-disc pl-5 mb-2;
    }
    
    :global(.rich-text-content ol) {
        @apply list-decimal pl-5 mb-2;
    }
    
    :global(.rich-text-content a) {
        @apply text-theme-500 hover:underline;
    }
    
    :global(.rich-text-content strong) {
        @apply font-bold;
    }
    
    :global(.rich-text-content em) {
        @apply italic;
    }
    
    :global(.rich-text-content u) {
        @apply underline;
    }
    
    :global(.rich-text-content mark) {
        @apply bg-yellow-200 dark:bg-yellow-500/30;
    }
    
    :global(.rich-text-content .text-left) {
        text-align: left;
    }
    
    :global(.rich-text-content .text-center) {
        text-align: center;
    }
    
    :global(.rich-text-content .text-right) {
        text-align: right;
    }
</style> 