import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../services/db';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ManageItemsScreen() {
    const router = useRouter();
    const [storesData, setStoresData] = useState<any[]>([]);
    const [openStores, setOpenStores] = useState<Record<number, boolean>>({});

    const fetchAllInventory = async () => {
        try {
            const stores: any[] = await db.getAllAsync('SELECT * FROM stores ORDER BY name ASC');
            
            const fullData = await Promise.all(stores.map(async (store) => {
                // ✅ ใช้ GROUP BY name เพื่อเอาชื่อที่ไม่ซ้ำ และ MAX(id) เพื่อเอาตัวล่าสุด
                const items: any[] = await db.getAllAsync(
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
        fetchAllInventory();
    }, []);

    const toggleStore = (storeId: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenStores(prev => ({ ...prev, [storeId]: !prev[storeId] }));
    };

    const handleUpdatePrice = async (itemId: number, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        try {
            // อัปเดตราคาล่าสุด
            await db.runAsync('UPDATE items SET last_price = ? WHERE id = ?', [price, itemId]);
        } catch (error) {
            Alert.alert("Error", "ไม่สามารถอัปเดตราคาได้");
        }
    };

    const handleDeleteItem = (itemId: number, itemName: string) => {
        Alert.alert(
            "ลบรายการนี้",
            `ต้องการลบ "${itemName}" ออกจากระบบใช่หรือไม่? (การลบจะลบทุกประวัติของชื่อนี้ในร้านนี้)`,
            [
                { text: "ยกเลิก", style: "cancel" },
                { 
                    text: "ลบ", 
                    style: "destructive", 
                    onPress: async () => {
                        // ดึงข้อมูลเพื่อหาชื่อและร้านค้าก่อนลบ
                        const item: any = await db.getFirstAsync('SELECT name, store_id FROM items WHERE id = ?', [itemId]);
                        if (item) {
                            // ลบทุกอย่างที่ชื่อเหมือนกันในร้านเดียวกัน เพื่อให้หายไปจริงๆ
                            await db.runAsync('DELETE FROM items WHERE name = ? AND store_id = ?', [item.name, item.store_id]);
                        }
                        fetchAllInventory();
                    } 
                }
            ]
        );
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
                {storesData.map((store) => (
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
                                            <View style={styles.priceContainer}>
                                                <Text style={styles.priceLabel}>฿</Text>
                                                <TextInput
                                                    style={styles.priceInput}
                                                    keyboardType="decimal-pad"
                                                    defaultValue={item.last_price.toString()}
                                                    onBlur={(e) => handleUpdatePrice(item.id, e.nativeEvent.text)}
                                                />
                                            </View>
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
                ))}
            </ScrollView>
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
    priceContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8, height: 32, borderWidth: 1, borderColor: '#E5E7EB' },
    priceLabel: { fontSize: 12, color: '#9ca3af', marginRight: 4 },
    priceInput: { fontSize: 14, fontWeight: 'bold', color: '#059669', width: 55, textAlign: 'center', padding: 0 },
    deleteBtn: { marginLeft: 15, padding: 5 }
});