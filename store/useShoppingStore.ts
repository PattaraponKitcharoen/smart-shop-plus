import { create } from 'zustand';
// 🚩 เปลี่ยนการ Import
import { getDB } from '../services/db';

interface ShoppingState {
  stores: any[];
  cartItems: any[];
  fetchData: () => Promise<void>;
  fetchCart: () => Promise<void>;
  toggleItem: (itemId: number, isChecked: boolean) => Promise<void>;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  stores: [],
  cartItems: [],

  // 🏠 ฟังก์ชันดึงข้อมูลหน้าหลัก (ของที่ยังไม่ได้ซื้อ)
  fetchData: async () => {
    try {
      const database = getDB(); // 🚩 เรียกใช้ getDB() เพื่อดึง instance ล่าสุด
      
      const storesData: any[] = await database.getAllAsync(`
        SELECT DISTINCT s.id, s.name 
        FROM stores s
        JOIN items i ON s.id = i.store_id
        WHERE i.is_checked = 0 AND i.is_active = 1
        ORDER BY s.name ASC
      `);

      const result = [];
      for (const store of storesData) {
        const aislesData: any[] = await database.getAllAsync(`
          SELECT DISTINCT a.id, a.name
          FROM aisles a
          JOIN items i ON a.id = i.aisle_id
          WHERE i.store_id = ? AND i.is_checked = 0 AND i.is_active = 1
          ORDER BY a.name ASC
        `, [store.id]);

        const aisles = [];
        for (const aisle of aislesData) {
          const items: any[] = await database.getAllAsync(`
            SELECT id as dbId, name, last_price as price, current_price as currentPrice, quantity
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

  // 🛒 ฟังก์ชันดึงข้อมูลหน้าตะกร้า
  fetchCart: async () => {
    try {
      const database = getDB(); // 🚩 เรียกใช้ getDB()
      const result: any[] = await database.getAllAsync(
        'SELECT id, name, last_price, current_price, quantity FROM items WHERE is_checked = 1'
      );
      set({ cartItems: result });
    } catch (error) {
      console.error("Fetch Cart Error:", error);
    }
  },

  // 🔄 ฟังก์ชันสลับสถานะการติ๊กสินค้า
  toggleItem: async (itemId: number, isChecked: boolean) => {
    try {
      const database = getDB(); // 🚩 เรียกใช้ getDB()
      
      // 1. อัปเดตในฐานข้อมูล
      await database.runAsync('UPDATE items SET is_checked = ? WHERE id = ?', [isChecked ? 1 : 0, itemId]);
      
      // 2. รีเฟรชข้อมูลหน้าปัจจุบัน
      await get().fetchData(); 

      // 3. รีเฟรชหน้าตะกร้าออโต้
      setTimeout(async () => {
        await get().fetchCart(); 
        console.log("Auto-refreshed Cart Data!");
      }, 2010);

    } catch (error) {
      console.error("Toggle Item Error:", error);
    }
  }
}));