import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// ✅ ใช้ legacy สำหรับ SDK 54
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { db } from '../../services/db';
import { useShoppingStore } from '../../store/useShoppingStore';

export default function ProfileScreen() {
  const [name, setName] = useState('Shopping Master');
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);

  const router = useRouter();
  const fetchData = useShoppingStore((state) => state.fetchData);

  const handleSaveName = () => {
    setName(tempName);
    setIsEditing(false);
  };

  // --- 📤 ฟังก์ชัน Export (แก้บั๊ก UTF8 แล้ว) ---
  const handleExportCSV = async () => {
    try {
      const allItems: any[] = await db.getAllAsync(`
        SELECT items.id, items.name as itemName, items.last_price as price,
               items.quantity as qty, aisles.name as aisleName, stores.name as storeName
        FROM items 
        LEFT JOIN aisles ON items.aisle_id = aisles.id
        LEFT JOIN stores ON items.store_id = stores.id
      `);

      if (allItems.length === 0) {
        Alert.alert("ไม่พบข้อมูล", "คุณยังไม่มีรายการสินค้าที่จะส่งออก");
        return;
      }

      const header = "ID,Product Name,Price,Quantity,Aisle/Category,Store Name\n";
      const rows = allItems.map(item => 
        `${item.id},"${item.itemName}",${item.price || 0},${item.qty || 1},"${item.aisleName || ''}","${item.storeName || ''}"`
      ).join("\n");
      
      const csvContent = header + rows;
      const fileName = `smart-shop-export-${Date.now()}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // ✅ แก้ไข: ใช้ "utf8" (ตัวเล็กทั้งหมด) แทน FileSystem.EncodingType.UTF8 เพื่อลดโอกาส Error
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: "utf8" });
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถส่งออกข้อมูลได้");
    }
  };

  // --- 📥 ฟังก์ชัน Import ---
  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/comma-separated-values',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, { encoding: "utf8" });

      const lines = content.split('\n').slice(1);
      let importedCount = 0;

      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!parts || parts.length < 6) continue;

        const [id, rawName, price, qty, rawAisle, rawStore] = parts;
        const itemName = rawName.replace(/"/g, '');
        const aisleName = rawAisle.replace(/"/g, '');
        const storeName = rawStore.replace(/"/g, '');

        if (storeName && storeName !== 'No Store') {
          await db.runAsync('INSERT OR IGNORE INTO stores (name) VALUES (?)', [storeName]);
        }
        if (aisleName && aisleName !== 'No Category') {
          await db.runAsync('INSERT OR IGNORE INTO aisles (name) VALUES (?)', [aisleName]);
        }

        const storeObj: any = await db.getFirstAsync('SELECT id FROM stores WHERE name = ?', [storeName]);
        const aisleObj: any = await db.getFirstAsync('SELECT id FROM aisles WHERE name = ?', [aisleName]);

        const existingItem: any = await db.getFirstAsync('SELECT id FROM items WHERE name = ?', [itemName]);

        if (existingItem) {
          await db.runAsync(
            'UPDATE items SET last_price = ?, quantity = ?, store_id = ?, aisle_id = ? WHERE id = ?',
            [parseFloat(price), parseInt(qty), storeObj?.id || null, aisleObj?.id || null, existingItem.id]
          );
        } else {
          await db.runAsync(
    'INSERT INTO items (name, last_price, quantity, store_id, aisle_id, is_active, is_checked) VALUES (?, ?, ?, ?, ?, 0, 0)',
    [itemName, parseFloat(price), parseInt(qty), storeObj?.id || null, aisleObj?.id || null]
  );
        }
        importedCount++;
      }

      await fetchData();
      Alert.alert("สำเร็จ", `นำเข้าข้อมูลเรียบร้อยแล้ว ${importedCount} รายการ`);
    } catch (error) {
      Alert.alert("ผิดพลาด", "ไม่สามารถนำเข้าข้อมูลได้");
    }
  };

  const handleClearAllData = async () => {
    try {
      await db.runAsync('DELETE FROM items');
      await db.runAsync('DELETE FROM aisles');
      await db.runAsync('DELETE FROM stores');
      await fetchData();
      Alert.alert("สำเร็จ", "ล้างข้อมูลเรียบร้อยแล้ว");
    } catch (error) {
      Alert.alert("ผิดพลาด", "ไม่สามารถล้างข้อมูลได้");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header ส่วนโปรไฟล์ */}
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <TouchableOpacity style={styles.avatarWrapper}>
            <Image 
              source={{ uri: `https://ui-avatars.com/api/?name=${name}&background=10b981&color=fff` }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>
          <View style={styles.textInfo}>
             <View style={styles.nameRow}>
                <Text style={styles.userName}>{name}</Text>
             </View>
            <Text style={styles.offlineStatus}>ข้อมูลเก็บในเครื่องเท่านั้น</Text>
          </View>
        </View>
      </View>

      {/* ✅ ส่วนที่หายไป: การตั้งค่าการช้อปปิ้ง */}
      <Text style={styles.sectionTitle}>การตั้งค่าการช้อปปิ้ง</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/manage-stores')}>
          <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
            <FontAwesome5 name="store" size={18} color="#0284c7" />
          </View>
          <Text style={styles.menuTitle}>แก้ไขรายชื่อร้านค้า</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/manage-aisles')}>
          <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
            <FontAwesome5 name="layer-group" size={18} color="#10b981" />
          </View>
          <Text style={styles.menuTitle}>จัดการหมวดหมู่/โซน</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/manage-items')}>
          <View style={[styles.iconBox, { backgroundColor: '#fff1f2' }]}>
            <FontAwesome5 name="box-open" size={18} color="#e11d48" />
          </View>
          <Text style={styles.menuTitle}>จัดการฐานข้อมูลสินค้า</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      {/* ส่วนการจัดการข้อมูลไฟล์ */}
      <Text style={styles.sectionTitle}>สำรองและกู้คืนข้อมูล</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={handleExportCSV}>
          <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
            <FontAwesome5 name="file-export" size={18} color="#ea580c" />
          </View>
          <Text style={styles.menuTitle}>ส่งออกข้อมูล (CSV)</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleImportCSV}>
          <View style={[styles.iconBox, { backgroundColor: '#ecfdf5' }]}>
            <FontAwesome5 name="file-import" size={18} color="#059669" />
          </View>
          <Text style={styles.menuTitle}>นำเข้าข้อมูล (CSV)</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.clearDataButton} onPress={handleClearAllData}>
          <Text style={styles.clearDataText}>ลบข้อมูลแอปทั้งหมด</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>Smart Shop Plus v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  profileInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E7EB' },
  textInfo: { marginLeft: 20, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  offlineStatus: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#9ca3af', marginLeft: 24, marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  menuContainer: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTitle: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
  footer: { marginTop: 40, paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
  clearDataButton: { paddingVertical: 12 },
  clearDataText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  versionText: { color: '#9ca3af', fontSize: 11, marginTop: 8 },
});