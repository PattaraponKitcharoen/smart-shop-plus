import { create } from 'zustand';
import { db } from '../services/db';

interface ShoppingState {
  stores: any[];
  cartItems: any[]; // ✅ เพิ่ม State สำหรับเก็บของในตะกร้า
  fetchData: () => Promise<void>;
  fetchCart: () => Promise<void>; // ✅ เพิ่มฟังก์ชันดึงของในตะกร้า
  toggleItem: (itemId: number, isChecked: boolean) => Promise<void>;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  stores: [],
  cartItems: [], // ค่าเริ่มต้นเป็นอาเรย์ว่าง

  // 🏠 ฟังก์ชันดึงข้อมูลหน้าหลัก (ของที่ยังไม่ได้ซื้อ)
  fetchData: async () => {
    try {
      const storesData: any[] = await db.getAllAsync(`
        SELECT DISTINCT s.id, s.name 
        FROM stores s
        JOIN items i ON s.id = i.store_id
        WHERE i.is_checked = 0 AND i.is_active = 1
        ORDER BY s.name ASC
      `);

      const result = [];
      for (const store of storesData) {
        const aislesData: any[] = await db.getAllAsync(`
          SELECT DISTINCT a.id, a.name
          FROM aisles a
          JOIN items i ON a.id = i.aisle_id
          WHERE i.store_id = ? AND i.is_checked = 0 AND i.is_active = 1
          ORDER BY a.name ASC
        `, [store.id]);

        const aisles = [];
        for (const aisle of aislesData) {
          const items: any[] = await db.getAllAsync(`
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

  // 🛒 ✅ ฟังก์ชันดึงข้อมูลหน้าตะกร้า (ของที่ติ๊กถูกแล้ว)
  fetchCart: async () => {
    try {
      const result: any[] = await db.getAllAsync(
        'SELECT id, name, last_price, current_price, quantity FROM items WHERE is_checked = 1'
      );
      set({ cartItems: result }); // อัปเดต State cartItems ทันที
    } catch (error) {
      console.error("Fetch Cart Error:", error);
    }
  },

  // 🔄 ฟังก์ชันสลับสถานะการติ๊กสินค้า
  toggleItem: async (itemId: number, isChecked: boolean) => {
    try {
      // 1. อัปเดตในฐานข้อมูล
      await db.runAsync('UPDATE items SET is_checked = ? WHERE id = ?', [isChecked ? 1 : 0, itemId]);
      
      // 2. รีเฟรชข้อมูลหน้าปัจจุบัน (หน้าหลัก) ทันที
      await get().fetchData(); 

      // 3. ✅ สั่งรีเฟรชหน้าตะกร้าออโต้หลังจากผ่านไป 3 วินาที
      // แม้ผู้ใช้จะเปิดหน้าตะกร้าค้างไว้ ข้อมูลจะเด้งขึ้นมาเอง
      setTimeout(async () => {
        await get().fetchCart(); 
        console.log("Auto-refreshed Cart Data!");
      }, 2010);

    } catch (error) {
      console.error("Toggle Item Error:", error);
    }
  }
}));