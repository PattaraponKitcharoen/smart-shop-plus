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

interface Store {
  id: number;
  name: string;
}

export default function ManageStoresScreen() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [inputText, setInputText] = useState('');
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await initDatabase();
        setIsDbReady(true);
        await loadStores();
      } catch (e) {
        console.error("Load stores error", e);
      }
    };
    prepare();
  }, []);

  const loadStores = async () => {
    try {
      const database = getDB();
      const result: Store[] = await database.getAllAsync('SELECT * FROM stores ORDER BY name ASC');
      setStores(result.filter(s => s.name && s.name.trim() !== ""));
    } catch (error) {
      console.error("Load stores error", error);
    }
  };

  const handleSave = async () => {
    if (!inputText.trim() || !isDbReady) return;
    try {
      const database = getDB();
      if (editingStore) {
        await database.runAsync('UPDATE stores SET name = ? WHERE id = ?', [inputText.trim(), editingStore.id]);
      } else {
        await database.runAsync('INSERT INTO stores (name) VALUES (?)', [inputText.trim()]);
      }
      setInputText('');
      setEditingStore(null);
      setModalVisible(false);
      await loadStores();
    } catch (error) {
      const msg = "ชื่อร้านนี้อาจจะมีอยู่แล้ว";
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert("Error", msg);
    }
  };

  const confirmDelete = (store: Store) => {
    const msg = `คุณต้องการลบร้าน "${store.name}" ใช่หรือไม่?`;
    const performDelete = async () => {
      try {
        const database = getDB();
        await database.runAsync('DELETE FROM stores WHERE id = ?', [store.id]);
        await loadStores();
      } catch (error) {
        console.error(error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) performDelete();
    } else {
      Alert.alert("ลบร้านค้า", msg, [
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
        <Text style={styles.headerTitle}>จัดการรายชื่อร้านค้า</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.storeName}>{item.name}</Text>
              <View style={styles.actions}>
                <TouchableOpacity 
                  onPress={() => { setEditingStore(item); setInputText(item.name); setModalVisible(true); }} 
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
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>
               {isDbReady ? "ไม่มีรายชื่อร้านค้า" : "กำลังโหลด..."}
            </Text>
          }
        />
      </View>

      <TouchableOpacity 
        style={[styles.fab, !isDbReady && { opacity: 0.5 }]}
        onPress={() => { if(isDbReady) { setEditingStore(null); setInputText(''); setModalVisible(true); } }}
        disabled={!isDbReady}
      >
        <FontAwesome5 name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      <Modal 
        visible={modalVisible} 
        animationType="fade" 
        transparent 
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          {/* 1. ส่วนที่เป็นฉากหลัง (แตะเพื่อปิดคีย์บอร์ด) */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          {/* 2. ส่วนที่เป็นกล่องเนื้อหา (แยกออกมาไม่ให้โดน Touchable คลุมทับ) */}
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingStore ? 'แก้ไขชื่อร้าน' : 'เพิ่มร้านใหม่'}</Text>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="พิมพ์ชื่อร้านที่นี่..."
              placeholderTextColor="#9ca3af"
              autoFocus={Platform.OS !== 'web'}
              {...Platform.select({ web: { outlineStyle: 'none' } })}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnTextCancel}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
                <Text style={styles.btnTextSave}>บันทึกข้อมูล</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  customHeader: {
    height: 60, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  content: { flex: 1 },
  listPadding: { padding: 16, paddingBottom: 100 },
  listItem: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  storeName: { fontSize: 16, color: '#374151', fontWeight: '500' },
  actions: { flexDirection: 'row' },
  iconBtn: { padding: 8, marginLeft: 12 },
  fab: {
    position: 'absolute', bottom: 30, right: 20,
    backgroundColor: '#10b981', width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  // 🚩 ปรับ modalOverlay ให้เป็นสัดส่วน
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24, 
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { 
    backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 20,
    color: '#1f2937'
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnCancel: { flex: 1, padding: 15, alignItems: 'center' },
  btnSave: { flex: 1, backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnTextCancel: { color: '#6b7280', fontWeight: '600' },
  btnTextSave: { color: '#fff', fontWeight: 'bold' }
});