import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDB, initDatabase } from '../services/db';

interface Aisle {
  id: number; 
  name: string; 
}

export default function ManageAislesScreen() {
  const router = useRouter();
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAisle, setEditingAisle] = useState<Aisle | null>(null);
  const [inputText, setInputText] = useState('');
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await initDatabase();
        setIsDbReady(true);
        await loadAisles();
      } catch (e) {
        console.error("Init Error:", e);
      }
    };
    prepare();
  }, []);

  const loadAisles = async () => {
    try {
      const database = getDB();
      
      // 🚩 ท่าเดียวกับ Manage Item: ดึงชื่อโซนจาก items ที่มีอยู่จริงมาโชว์
      const result: any[] = await database.getAllAsync(`
        SELECT DISTINCT TRIM(a.name) as name 
        FROM items i
        JOIN aisles a ON i.aisle_id = a.id
        WHERE a.name IS NOT NULL AND TRIM(a.name) != ""
        ORDER BY a.name ASC
      `);

      // 💡 สำรอง: ถ้าข้างบนไม่ขึ้น (เช่น เพิ่งลบสินค้าไปหมด) ให้ดึงจากตารางโซนตรงๆ
      let dataToShow = result;
      if (result.length === 0) {
        const fallback: any[] = await database.getAllAsync(
          'SELECT DISTINCT TRIM(name) as name FROM aisles WHERE name != ""'
        );
        dataToShow = fallback;
      }
      
      const formatted = dataToShow.map((item, index) => ({
        id: index, 
        name: item.name
      }));
      
      setAisles(formatted);
    } catch (error) {
      console.error("Load Error:", error);
    }
  };

  const handleSave = async () => {
    if (!inputText.trim() || !isDbReady) return;
    try {
      const database = getDB();
      if (editingAisle) {
        // แก้ไขชื่อในตารางแม่ (aisles)
        await database.runAsync(
          'UPDATE aisles SET name = ? WHERE name = ?', 
          [inputText.trim(), editingAisle.name]
        );
      } else {
        // เพิ่มใหม่
        await database.runAsync('INSERT OR IGNORE INTO aisles (name) VALUES (?)', [inputText.trim()]);
      }
      setInputText('');
      setEditingAisle(null);
      setModalVisible(false);
      await loadAisles();
    } catch (error) {
      console.error(error);
      if (Platform.OS === 'web') alert("บันทึกไม่ได้");
      else Alert.alert("Error", "บันทึกไม่ได้");
    }
  };

  const confirmDelete = (aisle: Aisle) => {
    const performDelete = async () => {
      try {
        const database = getDB();
        await database.runAsync('DELETE FROM aisles WHERE name = ?', [aisle.name]);
        await loadAisles();
      } catch (error) { console.error(error); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`ลบโซน "${aisle.name}"?`)) performDelete();
    } else {
      Alert.alert("ลบ", `ลบ "${aisle.name}"?`, [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบ", style: "destructive", onPress: performDelete }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="chevron-left" size={20} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการโซนสินค้า</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={aisles}
        keyExtractor={(item) => item.name} 
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.info}>
              <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                <FontAwesome5 name="layer-group" size={14} color="#10b981" />
              </View>
              <Text style={styles.aisleName}>{item.name}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => { setEditingAisle(item); setInputText(item.name); setModalVisible(true); }} style={styles.iconBtn}>
                <FontAwesome5 name="edit" size={16} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.iconBtn}>
                <FontAwesome5 name="trash-alt" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={<Text style={styles.emptyText}>{isDbReady ? "ไม่พบโซนสินค้า" : "กำลังโหลด..."}</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setEditingAisle(null); setInputText(''); setModalVisible(true); }}>
        <FontAwesome5 name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingAisle ? 'แก้ไข' : 'เพิ่ม'}โซน</Text>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="ชื่อโซน..."
              placeholderTextColor="#9ca3af"
              autoFocus
              {...Platform.select({ web: { outlineStyle: 'none' } })}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}><Text>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave}><Text style={{color:'#fff'}}>บันทึก</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  customHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  listPadding: { padding: 16, paddingBottom: 100 },
  listItem: { backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, elevation: 2 },
  info: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  aisleName: { fontSize: 16, color: '#374151', fontWeight: '500' },
  actions: { flexDirection: 'row' },
  iconBtn: { padding: 8, marginLeft: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#10b981', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 20, color: '#1f2937' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnCancel: { flex: 1, padding: 15, alignItems: 'center' },
  btnSave: { flex: 1, backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center' }
});