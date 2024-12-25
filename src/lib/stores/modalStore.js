import { writable } from 'svelte/store';

export const deleteModalStore = writable({
    show: false,
    type: '',
    context: '',
    count: 0,
    itemName: '',
    onConfirm: null
});