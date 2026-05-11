import * as SQLite from 'expo-sqlite';

// ตัวแปรเก็บ Instance ของ Database
let db: SQLite.SQLiteDatabase | null = null;
// ตัวแปรเช็คสถานะว่ากำลังโหลดอยู่หรือไม่ เพื่อป้องกันการเรียกซ้อน (Race Condition)
let isInitializing = false;

/**
 * ฟังก์ชันเริ่มต้นระบบฐานข้อมูล (Singleton Pattern)
 */
export const initDatabase = async () => {
  // 1. ถ้ามี db อยู่แล้ว ให้ส่งกลับทันที ไม่ต้องเสียเวลาเปิดใหม่
  if (db) return db;

  // 2. ถ้ามีฟังก์ชันอื่นกำลังสั่ง init อยู่ ให้รอจนกว่าจะเสร็จ
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return db;
  }

  isInitializing = true;
  console.log("🎬 Starting Database Initialization...");

  try {
    // 3. เปิดฐานข้อมูลแบบ Async (หัวใจสำคัญของการรันบน Web/Vercel)
    db = await SQLite.openDatabaseAsync('shopping.db');

    // 4. สร้างตารางและตั้งค่าพื้นฐาน
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      -- ตารางร้านค้า
      CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT UNIQUE
      );

      -- ตารางโซน/หมวดหมู่
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

    // 5. ระบบ Auto-Migration (ตรวจสอบคอลัมน์กันพลาด)
    const columns = [
      { table: 'items', col: 'store_id', type: 'INTEGER' },
      { table: 'items', col: 'is_active', type: 'INTEGER DEFAULT 1' },
      { table: 'items', col: 'quantity', type: 'INTEGER DEFAULT 1' }
    ];

    for (const item of columns) {
      try {
        await db.execAsync(`ALTER TABLE ${item.table} ADD COLUMN ${item.col} ${item.type};`);
      } catch (e) {
        // ถ้าขึ้น error แปลว่ามีคอลัมน์อยู่แล้ว (Ignore ได้เลย)
      }
    }

    console.log("✅ Database Ready (Async Singleton)");
    return db;
  } catch (error) {
    console.error("❌ DB Init Failed:", error);
    throw error;
  } finally {
    isInitializing = false; // ปลดล็อคสถานะเพื่อให้ฟังก์ชันอื่นทำงานต่อได้
  }
};

/**
 * ฟังก์ชันดึง Database Instance
 */
export const getDB = () => {
  if (!db) {
    throw new Error("Database not initialized. Please call initDatabase() first.");
  }
  return db;
};