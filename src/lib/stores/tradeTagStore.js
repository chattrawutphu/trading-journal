import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createTradeTagStore() {
    const { subscribe, set, update } = writable({
        tags: [],
        loading: false,
        error: null
    });

    return {
        subscribe,
        loadTags: async() => {
            try {
                update(state => ({...state, loading: true, error: null }));
                const tags = await api.getTradeTags();
                update(state => ({
                    ...state,
                    tags,
                    loading: false
                }));
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        addTag: async(tag) => {
            try {
                update(state => ({...state, loading: true, error: null }));
                const newTag = await api.addTradeTag(tag);
                update(state => ({
                    ...state,
                    tags: [...state.tags, newTag],
                    loading: false
                }));
                return newTag;
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        deleteTag: async(tagId) => {
            try {
                update(state => ({...state, loading: true, error: null }));
                await api.deleteTradeTag(tagId);
                update(state => ({
                    ...state,
                    tags: state.tags.filter(tag => tag._id !== tagId),
                    loading: false
                }));
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        clearError: () => {
            update(state => ({...state, error: null }));
        }
    };
}

export const tradeTagStore = createTradeTagStore();