import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Platform, // 🚩 เพิ่ม Platform
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDB, initDatabase } from '../services/db'; // 🚩 เพิ่ม initDatabase

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
    const [isDbReady, setIsDbReady] = useState(false); // 🚩 เพิ่มตัวแปรเช็คความพร้อม

    useEffect(() => {
        const prepare = async () => {
            try {
                await initDatabase();
                setIsDbReady(true);
                await loadAisles();
            } catch (e) {
                console.error("Manage Aisle Init Error:", e);
            }
        };
        prepare();
    }, []);

    const loadAisles = async () => {
        try {
            const database = getDB();
            const result: any[] = await database.getAllAsync(
                'SELECT DISTINCT TRIM(name) as name FROM aisles WHERE name IS NOT NULL AND name != "" ORDER BY TRIM(name) ASC'
            );
            
            const formattedAisles = result.map((item, index) => ({
                id: index, 
                name: item.name
            }));
            
            setAisles(formattedAisles);
        } catch (error) {
            console.error("Load aisles error", error);
        }
    };

    const handleSave = async () => {
        if (!inputText.trim() || !isDbReady) return;
        try {
            const database = getDB();
            
            if (editingAisle) {
                // อัปเดตทุกแถวที่มีชื่อเดิม
                await database.runAsync(
                    'UPDATE aisles SET name = ? WHERE name = ?', 
                    [inputText.trim(), editingAisle.name]
                );
                // อัปเดตตาราง items ด้วย
                await database.runAsync(
                    'UPDATE items SET aisle_id = (SELECT id FROM aisles WHERE name = ? LIMIT 1) WHERE aisle_id IN (SELECT id FROM aisles WHERE name = ?)',
                    [inputText.trim(), editingAisle.name]
                );
            } else {
                // เพิ่มโซนใหม่
                await database.runAsync('INSERT OR IGNORE INTO aisles (name) VALUES (?)', [inputText.trim()]);
            }

            setInputText('');
            setEditingAisle(null);
            setModalVisible(false);
            await loadAisles();
        } catch (error) {
            console.error(error);
            if (Platform.OS === 'web') alert("ไม่สามารถบันทึกข้อมูลได้");
            else Alert.alert("Error", "ไม่สามารถบันทึกข้อมูลได้");
        }
    };

    const confirmDelete = (aisle: Aisle) => {
        const msg = `คุณต้องการลบโซน "${aisle.name}" ใช่หรือไม่? (สินค้าในโซนนี้จะไม่หายไปแต่จะไม่มีโซนระบุ)`;
        
        const performDelete = async () => {
            try {
                const database = getDB();
                await database.runAsync('DELETE FROM aisles WHERE name = ?', [aisle.name]);
                await loadAisles();
            } catch (error) {
                console.error(error);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(msg)) performDelete();
        } else {
            Alert.alert("ลบโซนสินค้า", msg, [
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
                <Text style={styles.headerTitle}>จัดการโซน/หมวดหมู่</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
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
                        <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>
                            {!isDbReady ? 'กำลังโหลดฐานข้อมูล...' : 'ยังไม่มีโซนสินค้า'}
                        </Text>
                    }
                />
            </View>

            <TouchableOpacity 
                style={[styles.fab, !isDbReady && { opacity: 0.5 }]}
                onPress={() => { if(isDbReady) { setEditingAisle(null); setInputText(''); setModalVisible(true); } }}
                disabled={!isDbReady}
            >
                <FontAwesome5 name="plus" size={20} color="#fff" />
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingAisle ? 'แก้ไขชื่อโซน' : 'เพิ่มโซนใหม่'}</Text>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="เช่น ของสด, ขนม..."
                            placeholderTextColor="#9ca3af" // 🚩 บังคับสี placeholder
                            autoFocus
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
                </View>
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
    info: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    aisleName: { fontSize: 16, color: '#374151', fontWeight: '500' },
    actions: { flexDirection: 'row' },
    iconBtn: { padding: 8, marginLeft: 12 },
    fab: {
        position: 'absolute', bottom: 30, right: 20,
        backgroundColor: '#10b981', width: 56, height: 56, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center', elevation: 5,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    input: { 
        backgroundColor: '#F3F4F6', 
        borderRadius: 12, 
        padding: 15, 
        fontSize: 16, 
        marginBottom: 20,
        color: '#1f2937',
        ...Platform.select({ web: { outlineStyle: 'none' } }) // 🚩 ลบขอบฟ้าบนเว็บ
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    btnCancel: { flex: 1, padding: 15, alignItems: 'center' },
    btnSave: { flex: 1, backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center' },
    btnTextCancel: { color: '#6b7280', fontWeight: '600' },
    btnTextSave: { color: '#fff', fontWeight: 'bold' }
});