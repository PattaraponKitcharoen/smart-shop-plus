import { create } from 'zustand';
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

  fetchData: async () => {
    try {
      const database = getDB();
      
      // ดึงข้อมูลแบบ JOIN ทั้ง 3 ตารางมาในรอบเดียว
      const rawItems: any[] = await database.getAllAsync(`
        SELECT 
          i.id as dbId,
          i.name as name,
          i.last_price as price,
          i.current_price as currentPrice,
          i.quantity as quantity,
          s.id as storeId,
          s.name as storeName,
          a.id as aisleId,
          COALESCE(a.name, 'ทั่วไป') as aisleName
        FROM items i
        JOIN stores s ON i.store_id = s.id
        LEFT JOIN aisles a ON i.aisle_id = a.id
        WHERE i.is_checked = 0 AND i.is_active = 1
        ORDER BY s.name ASC, a.name ASC, i.name ASC
      `);

      // จัดกลุ่มข้อมูล (Grouping) จากรายการแบนๆ ให้เป็นโครงสร้าง Store > Aisle > Items
      const grouped = rawItems.reduce((acc: any[], item) => {
        // หา Store เดิม
        let store = acc.find(s => s.id === item.storeId);
        if (!store) {
          store = { id: item.storeId, name: item.storeName, aisles: [] };
          acc.push(store);
        }

        // หา Aisle เดิมใน Store นั้น
        let aisle = store.aisles.find((a: any) => a.name === item.aisleName);
        if (!aisle) {
          aisle = { id: item.aisleId, name: item.aisleName, items: [] };
          store.aisles.push(aisle);
        }

        // เพิ่ม Item ลงไป
        aisle.items.push(item);
        return acc;
      }, []);

      set({ stores: grouped });
    } catch (error) {
      console.error("Fetch Data Error:", error);
    }
  },

  fetchCart: async () => {
    try {
      const database = getDB();
      const result: any[] = await database.getAllAsync(
        'SELECT id, name, last_price, current_price, quantity FROM items WHERE is_checked = 1'
      );
      set({ cartItems: result });
    } catch (error) {
      console.error("Fetch Cart Error:", error);
    }
  },

  toggleItem: async (itemId: number, isChecked: boolean) => {
    try {
      const database = getDB();
      await database.runAsync('UPDATE items SET is_checked = ? WHERE id = ?', [isChecked ? 1 : 0, itemId]);
      
      await get().fetchData(); 

      // ปรับเวลาเล็กน้อยเพื่อให้ Animation ในหน้า Index ทำงานเสร็จก่อนค่อยดึงตะกร้า
      setTimeout(async () => {
        await get().fetchCart(); 
      }, 2050);
    } catch (error) {
      console.error("Toggle Item Error:", error);
    }
  }
}));