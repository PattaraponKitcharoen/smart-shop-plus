import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ✅ ใช้ legacy สำหรับ SDK 54
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDB } from '../../services/db';
import { useShoppingStore } from '../../store/useShoppingStore';

export default function ProfileScreen() {
  const [name, setName] = useState('Shopping Master');
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);

  const router = useRouter();
  const fetchData = useShoppingStore((state) => state.fetchData);

  const handleSaveName = () => {
    if (tempName.trim() === '') {
      Alert.alert("ผิดพลาด", "กรุณาระบุชื่อที่ต้องการ");
      return;
    }
    setName(tempName);
    setIsEditing(false);
  };

  // --- 📤 ฟังก์ชัน Export (ฉบับแก้ให้รันได้ทั้ง Web และ Mobile) ---
  const handleExportCSV = async () => {
    try {
      const database = getDB();
      const allItems: any[] = await database.getAllAsync(`
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

      // 🚩 ส่วนที่เพิ่มเข้ามาสำหรับมาตรฐาน Web API
      if (Platform.OS === 'web') {
        // 1. สร้าง Blob (ก้อนข้อมูลไฟล์)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        // 2. สร้าง URL ชั่วคราวสำหรับดาวน์โหลด
        const url = window.URL.createObjectURL(blob);
        // 3. สร้างปุ่มดาวน์โหลดปลอมๆ ขึ้นมาแล้วสั่งคลิกเอง
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        // 4. ทำความสะอาด
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log("✅ Web Export Success");
      } else {
        // 🚩 สำหรับ iOS / Android (ใช้โค้ดเดิมของคุณ)
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: "utf8" });
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error(error);
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

      const database = getDB();

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
        await database.runAsync('INSERT OR IGNORE INTO stores (name) VALUES (?)', [storeName]);
      }
      if (aisleName && aisleName !== 'No Category') {
        await database.runAsync('INSERT OR IGNORE INTO aisles (name) VALUES (?)', [aisleName]);
      }

      const storeObj: any = await database.getFirstAsync('SELECT id FROM stores WHERE name = ?', [storeName]);
      const aisleObj: any = await database.getFirstAsync('SELECT id FROM aisles WHERE name = ?', [aisleName]);
      const existingItem: any = await database.getFirstAsync('SELECT id FROM items WHERE name = ?', [itemName]);

      if (existingItem) {
        await database.runAsync(
          'UPDATE items SET last_price = ?, quantity = ?, store_id = ?, aisle_id = ? WHERE id = ?',
          [parseFloat(price), parseInt(qty), storeObj?.id || null, aisleObj?.id || null, existingItem.id]
        );
      } else {
        await database.runAsync(
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
    Alert.alert('ลบข้อมูลทั้งหมด', 'คุณแน่ใจหรือไม่ว่าต้องการล้างฐานข้อมูลแอปทั้งหมด? ข้อมูลนี้ไม่สามารถกู้คืนได้', [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
            text: 'ลบข้อมูล', 
            style: 'destructive',
            onPress: async () => {
                try {
                    const database = getDB();
      await database.runAsync('DELETE FROM items');
      await database.runAsync('DELETE FROM aisles');
      await database.runAsync('DELETE FROM stores');
      await fetchData();
                    Alert.alert("สำเร็จ", "ล้างข้อมูลเรียบร้อยแล้ว");
                  } catch (error) {
                    Alert.alert("ผิดพลาด", "ไม่สามารถล้างข้อมูลได้");
                  }
            }
        }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header ส่วนโปรไฟล์ */}
        <View style={styles.header}>
            <View style={styles.headerTextGroup}>
                <Text style={styles.dateText}></Text>
                <Text style={styles.title}>โปรไฟล์</Text>
            </View>

          <View style={styles.profileInfoCard}>
            <TouchableOpacity 
              style={styles.avatarWrapper}
              onPress={() => Alert.alert("Coming Soon", "ระบบเปลี่ยนรูปโปรไฟล์จะตามมาเร็วๆ นี้")}
            >
              <Image 
                source={{ uri: `https://ui-avatars.com/api/?name=${name}&background=10b981&color=fff&size=128` }} 
                style={styles.avatar} 
              />
              <View style={styles.cameraBadge}>
                <FontAwesome5 name="camera" size={8} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={styles.textInfo}>
              {isEditing ? (
                <View style={styles.editNameContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                    placeholder="ใส่ชื่อของคุณ"
                    onSubmitEditing={handleSaveName}
                  />
                  <TouchableOpacity style={styles.saveIconBtn} onPress={handleSaveName}>
                    <FontAwesome5 name="check-circle" size={20} color="#10b981" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.nameRow} 
                  onPress={() => {
                    setTempName(name);
                    setIsEditing(true);
                  }}
                >
                  <Text style={styles.userName}>{name}</Text>
                  <View style={styles.penIconBox}>
                    <FontAwesome5 name="pen" size={10} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              )}
              <View style={styles.statusRow}>
                 <View style={styles.onlineDot} />
                 <Text style={styles.offlineStatus}>ข้อมูลเก็บในเครื่องเท่านั้น</Text>
              </View>
            </View>
          </View>
        </View>

        {/* เมนูการตั้งค่า */}
        <View style={styles.contentArea}>
            <Text style={styles.sectionTitle}>การตั้งค่าการช้อปปิ้ง</Text>
            <View style={styles.menuCard}>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/manage-stores')}>
                <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
                    <FontAwesome5 name="store" size={16} color="#0284c7" />
                </View>
                <Text style={styles.menuTitle}>แก้ไขรายชื่อร้านค้า</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/manage-aisles')}>
                <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                    <FontAwesome5 name="layer-group" size={16} color="#10b981" />
                </View>
                <Text style={styles.menuTitle}>จัดการหมวดหมู่/โซน</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/manage-items')}>
                <View style={[styles.iconBox, { backgroundColor: '#fff1f2' }]}>
                    <FontAwesome5 name="box-open" size={16} color="#e11d48" />
                </View>
                <Text style={styles.menuTitle}>จัดการฐานข้อมูลสินค้า</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>สำรองและกู้คืนข้อมูล</Text>
            <View style={styles.menuCard}>
                <TouchableOpacity style={styles.menuItem} onPress={handleExportCSV}>
                <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
                    <FontAwesome5 name="file-export" size={16} color="#ea580c" />
                </View>
                <Text style={styles.menuTitle}>ส่งออกข้อมูล (CSV)</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleImportCSV}>
                <View style={[styles.iconBox, { backgroundColor: '#ecfdf5' }]}>
                    <FontAwesome5 name="file-import" size={16} color="#059669" />
                </View>
                <Text style={styles.menuTitle}>นำเข้าข้อมูล (CSV)</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
                </TouchableOpacity>
            </View>

            <View style={styles.footerArea}>
                <TouchableOpacity style={styles.clearDataButton} onPress={handleClearAllData}>
                <FontAwesome5 name="trash-alt" size={14} color="#ef4444" style={{marginRight: 8}} />
                <Text style={styles.clearDataText}>ลบข้อมูลแอปทั้งหมด</Text>
                </TouchableOpacity>
                <Text style={styles.versionText}>Smart Shop Plus v1.1.0 • Stable</Text>
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 24, paddingTop: 20, marginBottom: 0 },
  headerTextGroup: { marginBottom: 15, marginTop: -5 },
  dateText: { fontSize: 12, color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: -4 },
  title: { fontSize: 34, fontWeight: '900', color: '#1f2937', letterSpacing: -1.2 },

  profileInfoCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4
  },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E5E7EB' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10b981', width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  
  textInfo: { marginLeft: 16, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  penIconBox: { backgroundColor: '#F3F4F6', padding: 5, borderRadius: 6, marginLeft: 8 },
  
  editNameContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingLeft: 12 },
  nameInput: { fontSize: 18, fontWeight: '800', color: '#1f2937', paddingVertical: 8, flex: 1 },
  saveIconBtn: { padding: 12 },

  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 6 },
  offlineStatus: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },

  contentArea: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#9ca3af', marginLeft: 10, marginTop: 10, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 },
  
  menuCard: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F9FAFB' 
  },
  iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTitle: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '600' },

  footerArea: { marginTop: 20, paddingBottom: 40, alignItems: 'center' },
  clearDataButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1 },
  clearDataText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  versionText: { color: '#9ca3af', fontSize: 11, marginTop: 8, fontWeight: '500' },
});