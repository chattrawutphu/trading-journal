import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

// ปรับปรุง initial state
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

// ปรับปรุงฟังก์ชัน loadLayouts ให้ใช้ API แทน localStorage
layoutStore.loadLayouts = async () => {
    try {
        // เปลี่ยนจากการใช้ localStorage มาใช้ API
        const layouts = await api.getLayouts();
        
        // อัพเดต store ด้วยค่า layouts และคงค่า activeLayoutIndex ไว้
        layoutStore.update(state => ({
            ...state,
            layouts
        }));
        return layouts;
    } catch (error) {
        console.error('Error loading layouts from database:', error);
        // หากเกิดข้อผิดพลาด ส่งคืนอาร์เรย์ว่าง
        return [];
    }
};

// ปรับปรุงฟังก์ชัน saveLayouts ให้ใช้ API แทน localStorage
layoutStore.saveLayouts = async (layouts) => {
    try {
        // เปลี่ยนจากการใช้ localStorage มาใช้ API
        await api.saveLayouts(layouts);
        
        // อัพเดต store เฉพาะส่วน layouts
        layoutStore.update(state => ({
            ...state,
            layouts
        }));
        
        return true;
    } catch (error) {
        console.error('Error saving layouts to database:', error);
        throw error;
    }
};