import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList, // 🚩 เพิ่ม
  Keyboard // 🚩 เพิ่ม
  ,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, // 🚩 เพิ่ม
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDB, initDatabase } from '../services/db';

export default function ManageAislesScreen() {
  const router = useRouter();
  const [aisles, setAisles] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAisle, setEditingAisle] = useState<any | null>(null);
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
        const result: any[] = await database.getAllAsync('SELECT id, name FROM aisles');
        
        const formatted = result
            .filter(item => 
                item && 
                item.name && 
                typeof item.name === 'string' && 
                item.name.trim() !== ""
            )
            .map((item) => ({
                id: item.id,
                name: item.name.trim()
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'th'));
        
        setAisles(formatted);
    } catch (error) {
        console.error("❌ Load Error:", error);
        setAisles([]);
    }
  };

  const handleSave = async () => {
    if (!inputText.trim()) return;
    try {
      const database = getDB();
      if (editingAisle) {
        await database.runAsync('UPDATE aisles SET name = ? WHERE id = ?', [inputText.trim(), editingAisle.id]);
      } else {
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

  const confirmDelete = (aisle: any) => {
    const performDelete = async () => {
      try {
        const database = getDB();
        await database.runAsync('DELETE FROM aisles WHERE id = ?', [aisle.id]);
        await loadAisles();
      } catch (error) { console.error(error); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`ยืนยันลบโซน "${aisle.name}"?`)) performDelete();
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
          <FontAwesome5 name="arrow-left" size={20} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการโซนสินค้า</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={aisles}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()} 
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.info}>
              <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                <FontAwesome5 name="layer-group" size={14} color="#10b981" />
              </View>
              <Text style={styles.aisleName}>{item.name}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity 
                onPress={() => { setEditingAisle(item); setInputText(item.name); setModalVisible(true); }} 
                style={styles.iconBtn}
              >
                <FontAwesome5 name="edit" size={16} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.iconBtn}>
                <FontAwesome5 name="trash-alt" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isDbReady ? "ไม่พบข้อมูลโซนสินค้า" : "กำลังโหลด..."}
          </Text>
        }
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => { setEditingAisle(null); setInputText(''); setModalVisible(true); }}
      >
        <FontAwesome5 name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        {/* 🚩 ใช้ KeyboardAvoidingView เพื่อดันเนื้อหาขึ้นหนีแป้นพิมพ์ */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingAisle ? 'แก้ไข' : 'เพิ่ม'}โซน</Text>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="ระบุชื่อโซน..."
                placeholderTextColor="#9ca3af"
                autoFocus={Platform.OS !== 'web'} // 🚩 autoFocus เฉพาะมือถือ
                {...Platform.select({ web: { outlineStyle: 'none' } })}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnTextCancel}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
                  <Text style={styles.btnTextSave}>บันทึก</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 20, color: '#1f2937' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnCancel: { flex: 1, padding: 15, alignItems: 'center' },
  btnSave: { flex: 1, backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnTextCancel: { color: '#6b7280', fontWeight: '600' },
  btnTextSave: { color: '#fff', fontWeight: 'bold' }
});