import { create } from 'zustand';
import { db } from '../services/db';

interface ShoppingState {
  stores: any[];
  fetchData: () => Promise<void>;
  toggleItem: (itemId: number, isChecked: boolean) => Promise<void>;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  stores: [],

  fetchData: async () => {
  try {
    // 1. ดึงร้านค้าทั้งหมดที่มีสินค้า "ที่ยังไม่ได้ซื้อ (is_checked = 0)" และ "เปิดใช้งานอยู่ (is_active = 1)"
    const storesData: any[] = await db.getAllAsync(`
      SELECT DISTINCT s.id, s.name 
      FROM stores s
      JOIN items i ON s.id = i.store_id
      WHERE i.is_checked = 0 AND i.is_active = 1
      ORDER BY s.name ASC
    `);

    const result = [];

    for (const store of storesData) {
      // 2. ดึงโซน (Aisles) ที่มีอยู่ในร้านนั้นๆ
      const aislesData: any[] = await db.getAllAsync(`
        SELECT DISTINCT a.id, a.name
        FROM aisles a
        JOIN items i ON a.id = i.aisle_id
        WHERE i.store_id = ? AND i.is_checked = 0 AND i.is_active = 1
        ORDER BY a.name ASC
      `, [store.id]);

      const aisles = [];
      for (const aisle of aislesData) {
        // 3. ดึงรายการสินค้าในโซนนั้นของร้านนั้น
        const items: any[] = await db.getAllAsync(`
          SELECT 
            id as dbId, 
            name, 
            last_price as price, 
            current_price as currentPrice, 
            quantity
          FROM items
          WHERE store_id = ? AND aisle_id = ? AND is_checked = 0 AND is_active = 1
        `, [store.id, aisle.id]);

        if (items.length > 0) {
          aisles.push({ ...aisle, items });
        }
      }

      if (aisles.length > 0) {
        result.push({ ...store, aisles });
      }
    }

    set({ stores: result });
  } catch (error) {
    console.error("Fetch Data Error:", error);
  }
},

  toggleItem: async (itemId: number, isChecked: boolean) => {
    try {
      // เมื่อติ๊กถูกที่หน้าแรก ให้เปลี่ยน is_checked เป็น 1
      await db.runAsync('UPDATE items SET is_checked = ? WHERE id = ?', [isChecked ? 1 : 0, itemId]);
      await get().fetchData(); 
    } catch (error) {
      console.error("Toggle Item Error:", error);
    }
  }
}));