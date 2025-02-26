import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

// ปรับปรุง initial state ให้มี activeLayoutIndex
const initialState = {
    layouts: [],
    activeLayoutIndex: 0
};

// สร้าง store ด้วย writable
export const layoutStore = writable(initialState);

// เพิ่มฟังก์ชัน setActiveLayout เพื่อกำหนดว่า layout ไหนกำลัง active
layoutStore.setActiveLayout = (index) => {
    layoutStore.update(state => ({
        ...state,
        activeLayoutIndex: index
    }));
};

// ปรับปรุงฟังก์ชัน loadLayouts
layoutStore.loadLayouts = async () => {
    try {
        const storedLayouts = localStorage.getItem('layouts');
        if (storedLayouts) {
            const layouts = JSON.parse(storedLayouts);
            // อัพเดต store ด้วยค่า layouts และคงค่า activeLayoutIndex ไว้
            layoutStore.update(state => ({
                ...state,
                layouts
            }));
            return layouts;
        }
    } catch (error) {
        console.error('Error loading layouts:', error);
    }
    return [];
};

// ปรับปรุงฟังก์ชัน saveLayouts
layoutStore.saveLayouts = async (layouts) => {
    try {
        localStorage.setItem('layouts', JSON.stringify(layouts));
        // อัพเดต store เฉพาะส่วน layouts
        layoutStore.update(state => ({
            ...state,
            layouts
        }));
    } catch (error) {
        console.error('Error saving layouts:', error);
        throw error;
    }
};