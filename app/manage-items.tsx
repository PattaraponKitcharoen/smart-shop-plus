import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert, // 🚩 เพิ่ม
    Keyboard // 🚩 เพิ่ม
    ,


    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity, // 🚩 เพิ่ม
    TouchableWithoutFeedback,
    UIManager,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDB, initDatabase } from '../services/db';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ManageItemsScreen() {
    const router = useRouter();
    const [storesData, setStoresData] = useState<any[]>([]);
    const [openStores, setOpenStores] = useState<Record<number, boolean>>({});
    const [isReady, setIsReady] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [tempPrice, setTempPrice] = useState('');

    const fetchAllInventory = async () => {
        try {
            const database = getDB();
            const stores: any[] = await database.getAllAsync('SELECT * FROM stores ORDER BY name ASC');
            
            const fullData = await Promise.all(stores.map(async (store) => {
                const items: any[] = await database.getAllAsync(
                    `SELECT items.*, aisles.name as aisle_name 
                     FROM items 
                     LEFT JOIN aisles ON items.aisle_id = aisles.id 
                     WHERE items.id IN (
                        SELECT MAX(id) 
                        FROM items 
                        WHERE store_id = ? 
                        GROUP BY name
                     )
                     ORDER BY items.name ASC`,
                    [store.id]
                );
                return { ...store, items };
            }));

            setStoresData(fullData.filter(s => s.items.length > 0));
        } catch (error) {
            console.error("Fetch Inventory Error:", error);
        }
    };

    useEffect(() => {
        const setup = async () => {
            await initDatabase();
            setIsReady(true);
            await fetchAllInventory();
        };
        setup();
    }, []);

    const toggleStore = (storeId: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenStores(prev => ({ ...prev, [storeId]: !prev[storeId] }));
    };

    const openPriceModal = (item: any) => {
        setEditingItem(item);
        setTempPrice(item.last_price?.toString() || '');
        setModalVisible(true);
    };

    const handleSavePrice = async () => {
        if (!editingItem) return;
        const price = parseFloat(tempPrice) || 0;
        try {
            const database = getDB();
            await database.runAsync('UPDATE items SET last_price = ? WHERE id = ?', [price, editingItem.id]);
            setModalVisible(false);
            await fetchAllInventory();
        } catch (error) {
            console.error(error);
            if (Platform.OS !== 'web') Alert.alert("Error", "ไม่สามารถอัปเดตราคาได้");
        }
    };

    const handleDeleteItem = (itemId: number, itemName: string) => {
        const deleteAction = async () => {
            try {
                const database = getDB();
                await database.runAsync('DELETE FROM items WHERE id = ?', [itemId]);
                await fetchAllInventory();
            } catch (error) {
                console.error("Delete Error:", error);
            }
        };

        const message = `ต้องการลบ "${itemName}" ออกจากระบบใช่หรือไม่?`;
        if (Platform.OS === 'web') {
            if (window.confirm(message)) deleteAction();
        } else {
            Alert.alert("ลบรายการนี้", message, [
                { text: "ยกเลิก", style: "cancel" },
                { text: "ลบ", style: "destructive", onPress: deleteAction }
            ]);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <FontAwesome5 name="arrow-left" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View style={styles.headerTextWrapper}>
                        <Text style={styles.title}>คลังสินค้า (ไม่ซ้ำ)</Text>
                        <Text style={styles.subtitle}>จัดการราคาล่าสุดของสินค้าแต่ละชนิด</Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.content}>
                {!isReady ? (
                    <Text style={{ textAlign: 'center', marginTop: 20 }}>กำลังโหลดฐานข้อมูล...</Text>
                ) : storesData.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#9ca3af' }}>ยังไม่มีข้อมูลสินค้าในคลัง</Text>
                ) : (
                    storesData.map((store) => (
                        <View key={store.id} style={styles.storeCard}>
                            <TouchableOpacity style={styles.storeHeader} onPress={() => toggleStore(store.id)}>
                                <View style={styles.storeTitleRow}>
                                    <FontAwesome5 name="store" size={14} color="#059669" style={{ marginRight: 10 }} />
                                    <Text style={styles.storeName}>{store.name}</Text>
                                    <Text style={styles.itemCount}>{store.items.length} ชนิด</Text>
                                </View>
                                <FontAwesome5 name={openStores[store.id] ? "chevron-up" : "chevron-down"} size={12} color="#9ca3af" />
                            </TouchableOpacity>

                            {openStores[store.id] && (
                                <View style={styles.itemsList}>
                                    {store.items.map((item: any) => (
                                        <View key={item.id} style={styles.itemRow}>
                                            <View style={styles.itemInfo}>
                                                <Text style={styles.itemName}>{item.name}</Text>
                                                <Text style={styles.aisleText}>โซน: {item.aisle_name || 'ทั่วไป'}</Text>
                                            </View>

                                            <View style={styles.actionArea}>
                                                <TouchableOpacity 
                                                    style={styles.priceContainer} 
                                                    onPress={() => openPriceModal(item)}
                                                >
                                                    <Text style={styles.priceLabel}>฿</Text>
                                                    <Text style={styles.priceValueText}>
                                                        {item.last_price?.toLocaleString() || "0"}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity 
                                                    onPress={() => handleDeleteItem(item.id, item.name)}
                                                    style={styles.deleteBtn}
                                                >
                                                    <FontAwesome5 name="trash-alt" size={14} color="#fca5a5" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
                {/* 🚩 ใช้ KeyboardAvoidingView เพื่อดัน Modal ขึ้นหนีแป้นพิมพ์ */}
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    style={styles.modalOverlay}
                >
                    {/* 1. ชั้นฉากหลัง: แตะเพื่อปิดคีย์บอร์ด (แยกชั้นออกมาไม่ให้ทับ Content) */}
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={StyleSheet.absoluteFill} />
                    </TouchableWithoutFeedback>

                    {/* 2. ชั้นเนื้อหา: แยกออกมาให้รับแรงกด (Touch) ได้ตามปกติ */}
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>แก้ไขราคาสินค้า</Text>
                        <Text style={styles.modalSubTitle}>{editingItem?.name}</Text>
                        
                        <View style={styles.modalInputWrapper}>
                            <Text style={styles.modalCurrency}>฿</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={tempPrice}
                                onChangeText={setTempPrice}
                                placeholder="0.00"
                                placeholderTextColor="#d1d5db"
                                keyboardType="decimal-pad"
                                autoFocus={Platform.OS !== 'web'} 
                                {...Platform.select({ web: { outlineStyle: 'none' } })}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnTextCancel}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnSave} onPress={handleSavePrice}>
                                <Text style={styles.btnTextSave}>บันทึก</Text>
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
    header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    headerTop: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    backButton: { padding: 8 },
    headerTextWrapper: { marginLeft: 10 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 12, color: '#6b7280' },
    content: { padding: 15 },
    storeCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, elevation: 1, overflow: 'hidden' },
    storeHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center' },
    storeTitleRow: { flexDirection: 'row', alignItems: 'center' },
    storeName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    itemCount: { fontSize: 12, color: '#9ca3af', marginLeft: 8 },
    itemsList: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    itemRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '600', color: '#374151' },
    aisleText: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
    actionArea: { flexDirection: 'row', alignItems: 'center' },
    priceContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F3F4F6', 
        borderRadius: 6, 
        paddingHorizontal: 10, 
        height: 32, 
        borderWidth: 1, 
        borderColor: '#E5E7EB' 
    },
    priceLabel: { fontSize: 12, color: '#9ca3af', marginRight: 4 },
    priceValueText: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
    deleteBtn: { marginLeft: 15, padding: 5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%', maxWidth: 400 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#111827' },
    modalSubTitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20, marginTop: 4 },
    modalInputWrapper: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F3F4F6', 
        borderRadius: 12, 
        paddingHorizontal: 15, 
        height: 54, 
        marginBottom: 20 
    },
    modalCurrency: { fontSize: 18, fontWeight: 'bold', color: '#9ca3af', marginRight: 10 },
    modalInput: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#059669' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    btnCancel: { flex: 1, padding: 15, alignItems: 'center' },
    btnSave: { flex: 1, backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center' },
    btnTextCancel: { color: '#6b7280', fontWeight: '600' },
    btnTextSave: { color: '#fff', fontWeight: 'bold' }
});