import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
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
import { db } from '../../services/db';
import { useShoppingStore } from '../../store/useShoppingStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ShoppingScreen() {
  const { stores, fetchData, toggleItem } = useShoppingStore();
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
  const [isReady, setIsReady] = useState(false);
  const [pendingChecks, setPendingChecks] = useState<Record<number, any>>({});

  useEffect(() => {
    const prepare = async () => {
      try {
        await fetchData();
        setIsReady(true);
      } catch (e) {
        setTimeout(prepare, 500);
      }
    };
    prepare();
  }, []);

  const toggleDropdown = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ✅ ฟังก์ชันใหม่: ปรับจำนวนสินค้าในฐานข้อมูล
  const updateQuantity = async (dbId: number, delta: number) => {
    try {
      // ดึงข้อมูลปัจจุบันมาเช็ค
      const item: any = await db.getFirstAsync('SELECT quantity FROM items WHERE id = ?', [dbId]);
      if (item) {
        const newQty = item.quantity + delta;
        if (newQty >= 1) {
          await db.runAsync('UPDATE items SET quantity = ? WHERE id = ?', [newQty, dbId]);
          await fetchData(); // รีเฟรชข้อมูลหน้าจอ
        }
      }
    } catch (error) {
      console.error("Update Qty Error:", error);
    }
  };

  const handleSavePriceToDB = async (dbId: number, text: string) => {
    try {
      const unitPriceToday = parseFloat(text) || 0;
      await db.runAsync('UPDATE items SET current_price = ? WHERE id = ?', [unitPriceToday, dbId]);
      await fetchData(); 
    } catch (error) {
      console.error("Save Price Error:", error);
    }
  };

  const handleCheckItem = (dbId: number) => {
    // 1. ถ้ามีการกดซ้ำในขณะที่กำลังนับถอยหลัง (Cancel)
    if (pendingChecks[dbId]) {
      clearTimeout(pendingChecks[dbId]);
      setPendingChecks(prev => {
        const newState = { ...prev };
        delete newState[dbId];
        return newState;
      });
      return;
    }

    // 2. เริ่มนับถอยหลัง 2 วินาทีเพื่อติ๊กถูก (Visual Effect ในหน้าหลัก)
    const timer = setTimeout(async () => {
      // ✅ สั่ง LayoutAnimation เพื่อความนุ่มนวล
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      // ✅ เรียกใช้ toggleItem จาก Store 
      // (ซึ่งข้างใน Store เราเขียนไว้แล้วว่าให้ fetchData ทันที และรอ 3 วิเพื่อ fetchCart)
      await toggleItem(dbId, true); 

      // ลบสถานะ Pending ออกหลังจากทำงานเสร็จ
      setPendingChecks(prev => {
        const newState = { ...prev };
        delete newState[dbId];
        return newState;
      });
    }, 2000);

    setPendingChecks(prev => ({ ...prev, [dbId]: timer }));
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}><Text>กำลังเตรียมข้อมูล...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>รายการช้อปปิ้ง</Text>
          <Text style={styles.greetingText}>วันนี้ซื้ออะไรดี?</Text>
        </View>
      </View>

      <ScrollView style={styles.listArea}>
        {stores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="clipboard-list" size={50} color="#e5e7eb" />
            <Text style={styles.emptyText}>ไม่มีรายการที่ต้องซื้อ{"\n"}เพิ่มของได้ที่หน้า "เพิ่มของ" นะครับ</Text>
          </View>
        ) : (
          stores.map((store: any) => {
            const storeKey = `store-${store.id}`;
            const isStoreOpen = openStates[storeKey] !== false;

            return (
              <View key={storeKey} style={styles.storeCard}>
                <TouchableOpacity style={styles.storeHeader} onPress={() => toggleDropdown(storeKey)}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <FontAwesome5 name={isStoreOpen ? "chevron-up" : "chevron-down"} size={14} color="#065f46" />
                </TouchableOpacity>
                
                {isStoreOpen && store.aisles.map((aisle: any) => {
                  const aisleKey = `store-${store.id}-aisle-${aisle.name}`;
                  const isAisleOpen = openStates[aisleKey] !== false;

                  return (
                    <View key={aisleKey} style={styles.aisleSection}>
                      <TouchableOpacity style={styles.aisleHeader} onPress={() => toggleDropdown(aisleKey)}>
                        <Text style={styles.aisleName}>{aisle.name}</Text>
                        <FontAwesome5 name={isAisleOpen ? "caret-up" : "caret-down"} size={12} color="#9ca3af" />
                      </TouchableOpacity>

                      {isAisleOpen && aisle.items.map((item: any) => {
                        const isPending = !!pendingChecks[item.dbId];
                        
                        return (
                          <View key={`item-${item.dbId}`} style={[styles.itemRow, isPending && styles.itemRowPending]}>
                            <TouchableOpacity 
                              style={[styles.checkCircle, isPending && styles.checkCircleChecked]} 
                              onPress={() => handleCheckItem(item.dbId)}
                            >
                              {isPending && <FontAwesome5 name="check" size={14} color="#fff" />}
                            </TouchableOpacity>
                            
                            <View style={styles.itemInfo}>
                              <View style={styles.nameRow}>
                                <Text style={[styles.itemName, isPending && styles.textStrikethrough]}>
                                  {item.name}
                                </Text>
                              </View>
                              <Text style={[styles.itemPrice, isPending && styles.textGray]}>
                                ล่าสุด: ฿{item.price.toFixed(0)}
                              </Text>

                              {/* ✅ UI ส่วนปรับจำนวน */}
                              <View style={styles.qtyController}>
                                <TouchableOpacity 
                                  onPress={() => updateQuantity(item.dbId, -1)}
                                  disabled={isPending || item.quantity <= 1}
                                  style={[styles.qtyBtn, item.quantity <= 1 && { opacity: 0.3 }]}
                                >
                                  <FontAwesome5 name="minus" size={10} color="#6b7280" />
                                </TouchableOpacity>
                                
                                <Text style={styles.qtyValueText}>{item.quantity}</Text>

                                <TouchableOpacity 
                                  onPress={() => updateQuantity(item.dbId, 1)}
                                  disabled={isPending}
                                  style={styles.qtyBtn}
                                >
                                  <FontAwesome5 name="plus" size={10} color="#6b7280" />
                                </TouchableOpacity>
                              </View>
                            </View>
                            
                            <View style={styles.priceActionArea}>
                              <TextInput 
                                style={[styles.priceInput, isPending && { opacity: 0.4 }]} 
                                placeholder="฿/หน่วย"
                                keyboardType="decimal-pad"
                                editable={!isPending}
                                defaultValue={item.currentPrice > 0 ? item.currentPrice.toString() : ''}
                                onBlur={(e) => handleSavePriceToDB(item.dbId, e.nativeEvent.text)}
                              />
                              {item.currentPrice > 0 && (
                                <Text style={styles.totalHintText}>
                                  รวม: ฿{(item.currentPrice * item.quantity).toFixed(0)}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20 },
  dateText: { fontSize: 13, color: '#6b7280' },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  listArea: { paddingHorizontal: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 15, lineHeight: 22 },
  storeCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', elevation: 2 },
  storeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#ecfdf5' },
  storeName: { fontWeight: 'bold', fontSize: 16, color: '#065f46' },
  aisleSection: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  aisleHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#fafafa' },
  aisleName: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  itemRowPending: { backgroundColor: '#f9fafb' },
  checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#10b981', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkCircleChecked: { backgroundColor: '#10b981' },
  itemInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  itemName: { fontSize: 15, color: '#374151', fontWeight: '600' },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
  textGray: { color: '#d1d5db' },
  itemPrice: { fontSize: 11, color: '#9ca3af' },
  
  // ✅ สไตล์ส่วนปรับจำนวน
  qtyController: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  qtyBtn: { width: 24, height: 24, backgroundColor: '#f3f4f6', borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  qtyValueText: { marginHorizontal: 12, fontSize: 14, fontWeight: 'bold', color: '#1f2937', minWidth: 15, textAlign: 'center' },

  priceActionArea: { alignItems: 'flex-end' },
  priceInput: { width: 85, height: 36, backgroundColor: '#f3f4f6', borderRadius: 8, textAlign: 'center', fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827' },
  totalHintText: { fontSize: 10, color: '#10b981', fontWeight: 'bold', marginTop: 2 }
});