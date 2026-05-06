import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('shopping.db');

export const initDatabase = async () => {
  try {
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      -- 1. ตารางร้านค้า (อิสระ)
      CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT UNIQUE
      );

      -- 2. ตารางโซน (อิสระ - ไม่มี store_id แล้ว เพื่อให้ใช้ซ้ำได้ทุกร้าน)
      CREATE TABLE IF NOT EXISTS aisles (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT UNIQUE
      );

      -- 3. ตารางสินค้า (เป็นตัวเชื่อม Store และ Aisle)
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        store_id INTEGER, -- เชื่อมกับร้านค้าโดยตรง
        aisle_id INTEGER, -- เชื่อมกับโซนโดยตรง
        name TEXT, 
        last_price REAL DEFAULT 0, 
        current_price REAL DEFAULT 0, 
        quantity INTEGER DEFAULT 1, 
        is_checked INTEGER DEFAULT 0, 
        is_active INTEGER DEFAULT 1, 
        FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
        FOREIGN KEY (aisle_id) REFERENCES aisles (id) ON DELETE CASCADE
      );
    `);
    
    // --- ระบบ Migration (ปรับปรุงคอลัมน์) ---

    // เพิ่ม store_id ใน items (กรณีมีตารางเก่าที่ยังไม่มีคอลัมน์นี้)
    try {
      await db.execAsync(`ALTER TABLE items ADD COLUMN store_id INTEGER;`);
      console.log("✅ Added store_id column to items");
    } catch (e) { /* มีแล้ว */ }

    // ตรวจสอบคอลัมน์อื่นๆ
    try {
      await db.execAsync(`ALTER TABLE items ADD COLUMN is_active INTEGER DEFAULT 1;`);
    } catch (e) { /* มีแล้ว */ }

    try {
      await db.execAsync(`ALTER TABLE items ADD COLUMN quantity INTEGER DEFAULT 1;`);
    } catch (e) { /* มีแล้ว */ }

    console.log("✅ Database structure updated: Stores and Aisles are now independent!");
  } catch (e) {
    console.error("❌ DB Init Error:", e);
  }
};