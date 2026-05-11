import * as SQLite from 'expo-sqlite';

// สร้างตัวแปรไว้เก็บ Instance ของ Database
let db: SQLite.SQLiteDatabase | null = null;

/**
 * ฟังก์ชันเริ่มต้นระบบฐานข้อมูล (เรียกใช้ครั้งเดียวตอนเปิดแอป)
 */
export const initDatabase = async () => {
  try {
    // 1. เปิดฐานข้อมูลแบบ Async (จำเป็นมากสำหรับ Web เพื่อป้องกัน Timeout)
    db = await SQLite.openDatabaseAsync('shopping.db');

    // 2. สร้างตารางพื้นฐาน
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      -- ตารางร้านค้า
      CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT UNIQUE
      );

      -- ตารางโซน/ชั้นวาง
      CREATE TABLE IF NOT EXISTS aisles (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT UNIQUE
      );

      -- ตารางสินค้า
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        store_id INTEGER,
        aisle_id INTEGER,
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

    // 3. ระบบ Migration (กันเหนียวสำหรับกรณีตารางเก่าไม่มีคอลัมน์ใหม่)
    const migrations = [
      `ALTER TABLE items ADD COLUMN store_id INTEGER;`,
      `ALTER TABLE items ADD COLUMN is_active INTEGER DEFAULT 1;`,
      `ALTER TABLE items ADD COLUMN quantity INTEGER DEFAULT 1;`
    ];

    for (const sql of migrations) {
      try {
        await db.execAsync(sql);
      } catch (e) {
        // ถ้า Error แปลว่ามีคอลัมน์นั้นอยู่แล้ว ข้ามไปได้เลย
      }
    }

    console.log("✅ Database initialized successfully (Async Mode)");
  } catch (e) {
    console.error("❌ DB Init Error:", e);
    throw e; // ส่งต่อ error เพื่อให้หน้า UI รู้
  }
};

/**
 * ฟังก์ชันสำหรับดึง Database Instance ไปใช้งานในหน้าอื่นๆ
 */
export const getDB = () => {
  if (!db) {
    throw new Error("Database not initialized. Please call initDatabase() first.");
  }
  return db;
};