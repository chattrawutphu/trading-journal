import { writable } from 'svelte/store';

function createWidgetStore() {
    const { subscribe, set, update } = writable([]);

    return {
        subscribe,
        set,
        update,
        addWidget: (widget) => update(widgets => [...widgets, widget]),
        removeWidget: (widgetId) => update(widgets => widgets.filter(w => w.id !== widgetId)),
        updateWidget: (widgetId, newConfig) => update(widgets =>
            widgets.map(w => w.id === widgetId ? {...w, config: newConfig } : w)
        ),
        reorderWidgets: (newOrder) => set(newOrder),
        loadFromStorage: () => {
            const saved = localStorage.getItem('widgetLayout');
            if (saved) {
                set(JSON.parse(saved));
            }
        },
        saveToStorage: (widgets) => {
            localStorage.setItem('widgetLayout', JSON.stringify(widgets));
        }
    };
}

export const widgetStore = createWidgetStore();