import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createDayTagStore() {
    const { subscribe, set, update } = writable({
        tags: [],
        loading: false,
        error: null
    });

    return {
        subscribe,
        loadTags: async() => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const tags = await api.getDayTags();
                update(state => ({
                    ...state,
                    tags: tags.map(tag => ({ 
                        value: tag.value, 
                        _id: tag._id,
                        usageCount: tag.usageCount || 0
                    })),
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
            if (!tag || typeof tag !== 'string') {
                throw new Error('Tag value is required and must be a string');
            }

            const trimmedTag = tag.trim();
            if (!trimmedTag) {
                throw new Error('Tag value cannot be empty');
            }

            try {
                update(state => ({ ...state, loading: true, error: null }));
                const newTag = await api.createDayTag(trimmedTag);
                update(state => ({
                    ...state,
                    tags: [...state.tags, { 
                        value: newTag.value, 
                        _id: newTag._id,
                        usageCount: newTag.usageCount || 0
                    }],
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
                update(state => ({ ...state, loading: true, error: null }));
                await api.deleteDayTag(tagId);
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
            update(state => ({ ...state, error: null }));
        }
    };
}

export const dayTagStore = createDayTagStore(); 