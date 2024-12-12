import { writable } from 'svelte/store';

function createTransactionCacheStore() {
    const { subscribe, set, update } = writable({});

    return {
        subscribe,
        set,
        update,
        setCache: (accountId, data) => {
            update(cache => ({
                ...cache,
                [accountId]: data
            }));
        },
        clearCache: (accountId) => {
            update(cache => {
                const newCache = { ...cache };
                delete newCache[accountId];
                return newCache;
            });
        },
        clearAll: () => set({}),
        getCache: (accountId) => {
            let cache;
            subscribe(value => {
                cache = value[accountId];
            })();
            return cache;
        }
    };
}

export const transactionCacheStore = createTransactionCacheStore();
