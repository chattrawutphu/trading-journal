import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

export const tradeTagStore = writable({
    tags: [],
    loading: false,
    error: null
});

export async function loadTags() {
    tradeTagStore.update(state => ({ ...state, loading: true, error: null }));
    try {
        const tags = await api.getTradeTags();
        tradeTagStore.update(state => ({ ...state, tags, loading: false }));
    } catch (error) {
        tradeTagStore.update(state => ({ ...state, error: error.message, loading: false }));
    }
}

export async function addTag(tag) {
    try {
        const newTag = await api.createTradeTag(tag);
        tradeTagStore.update(state => ({
            ...state,
            tags: [...state.tags, newTag]
        }));
        return newTag;
    } catch (error) {
        console.error('Error adding tag:', error);
        throw new Error(error.message);
    }
}

export async function deleteTag(tagId) {
    try {
        await api.deleteTradeTag(tagId);
        tradeTagStore.update(state => ({
            ...state,
            tags: state.tags.filter(tag => tag._id !== tagId)
        }));
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function updateTagUsage(tagIds) {
    try {
        await api.updateTradeTagUsage(tagIds);
        await loadTags();
    } catch (error) {
        throw new Error(error.message);
    }
}