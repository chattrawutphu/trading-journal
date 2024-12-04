import { writable } from 'svelte/store';

function createLeverageStore() {
    const { subscribe, update, set } = writable({});

    return {
        subscribe,
        setLeverage: (symbol, leverage) => update(store => ({
            ...store,
            [symbol]: parseInt(leverage) || 1
        })),
        getLeverage: (symbol) => {
            let store;
            subscribe(value => { store = value; })();
            return store[symbol] || 1;
        },
        reset: () => set({})
    };
}

export const leverageStore = createLeverageStore();
