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
import { getDB, initDatabase } from '../../services/db';
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
      // 🚩 1. สั่งเปิด Database แบบ Async ก่อนเลย
      await initDatabase(); 
      
      // 🚩 2. พอ DB พร้อมค่อยดึงข้อมูล
      await fetchData();
      
      setIsReady(true);
    } catch (e) {
      console.error("Prepare Error:", e);
      // ถ้าพังให้ลองใหม่ใน 1 วินาที
      setTimeout(prepare, 1000);
    }
  };
  prepare();
}, []);

  const toggleDropdown = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateQuantity = async (dbId: number, delta: number) => {
  try {
    const database = getDB(); // 🚩 ดึง Instance ล่าสุดมา
    const item: any = await database.getFirstAsync('SELECT quantity FROM items WHERE id = ?', [dbId]);
    
    if (item) {
      const newQty = item.quantity + delta;
      if (newQty >= 1) {
        await database.runAsync('UPDATE items SET quantity = ? WHERE id = ?', [newQty, dbId]);
        await fetchData();
      }
    }
  } catch (error) {
    console.error("Update Qty Error:", error);
  }
};

  const handleSavePriceToDB = async (dbId: number, text: string) => {
  try {
    const database = getDB(); // 🚩 ดึง Instance มา
    const unitPriceToday = parseFloat(text) || 0;
    await database.runAsync('UPDATE items SET current_price = ? WHERE id = ?', [unitPriceToday, dbId]);
    await fetchData(); 
  } catch (error) {
    console.error("Save Price Error:", error);
  }
};

  const handleCheckItem = (dbId: number) => {
    if (pendingChecks[dbId]) {
      clearTimeout(pendingChecks[dbId]);
      setPendingChecks(prev => {
        const newState = { ...prev };
        delete newState[dbId];
        return newState;
      });
      return;
    }

    const timer = setTimeout(async () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await toggleItem(dbId, true); 
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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>กำลังเตรียมรายการ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}> 
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* วันที่: บีบให้ชิดหัวข้อด้านล่าง */}
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {/* หัวข้อ: ปรับให้ตัวใหญ่ หนา และขยับขึ้นไปชิดด้านบน */}
          <Text style={styles.greetingText}>รายการช้อปปิ้ง</Text>
        </View>
      </View>

      <ScrollView style={styles.listArea} showsVerticalScrollIndicator={false}>
        {stores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
               <FontAwesome5 name="clipboard-check" size={50} color="#d1d5db" />
            </View>
            <Text style={styles.emptyText}>ช้อปครบเรียบร้อยแล้ว!{"\n"}หรือยังไม่มีรายการที่เพิ่มไว้</Text>
          </View>
        ) : (
          stores.map((store: any) => {
            const storeKey = `store-${store.id}`;
            const isStoreOpen = openStates[storeKey] !== false;

            return (
              <View key={storeKey} style={styles.storeCard}>
                <TouchableOpacity style={styles.storeHeader} onPress={() => toggleDropdown(storeKey)} activeOpacity={0.7}>
                  <View style={styles.storeTitleRow}>
                    <FontAwesome5 name="store" size={14} color="#059669" style={{ marginRight: 10 }} />
                    <Text style={styles.storeName}>{store.name}</Text>
                  </View>
                  <FontAwesome5 name={isStoreOpen ? "chevron-up" : "chevron-down"} size={14} color="#059669" />
                </TouchableOpacity>
                
                {isStoreOpen && store.aisles.map((aisle: any) => {
                  const aisleKey = `store-${store.id}-aisle-${aisle.name}`;
                  const isAisleOpen = openStates[aisleKey] !== false;

                  return (
                    <View key={aisleKey} style={styles.aisleSection}>
                      <TouchableOpacity style={styles.aisleHeader} onPress={() => toggleDropdown(aisleKey)} activeOpacity={0.6}>
                        <Text style={styles.aisleName}>{aisle.name}</Text>
                        <View style={styles.aisleLine} />
                        <FontAwesome5 name={isAisleOpen ? "caret-up" : "caret-down"} size={12} color="#9ca3af" />
                      </TouchableOpacity>

                      {isAisleOpen && aisle.items.map((item: any) => {
                        const isPending = !!pendingChecks[item.dbId];
                        
                        return (
                          <View key={`item-${item.dbId}`} style={[styles.itemRow, isPending && styles.itemRowPending]}>
                            {/* Checkbox ที่ดูนุ่มนวลขึ้น */}
                            <TouchableOpacity 
                              style={[styles.checkCircle, isPending && styles.checkCircleChecked]} 
                              onPress={() => handleCheckItem(item.dbId)}
                            >
                              {isPending && <FontAwesome5 name="check" size={14} color="#fff" />}
                            </TouchableOpacity>
                            
                            <View style={styles.itemInfo}>
                              <Text style={[styles.itemName, isPending && styles.textStrikethrough]}>
                                {item.name}
                              </Text>
                              <Text style={styles.lastPriceText}>ล่าสุด: ฿{item.price.toFixed(0)}</Text>

                              {/* Qty Controller ที่ดูเป็นสัดส่วน */}
                              <View style={styles.qtyController}>
                                <TouchableOpacity 
                                  onPress={() => updateQuantity(item.dbId, -1)}
                                  disabled={isPending || item.quantity <= 1}
                                  style={[styles.qtyBtn, item.quantity <= 1 && { opacity: 0.3 }]}
                                >
                                  <FontAwesome5 name="minus" size={8} color="#059669" />
                                </TouchableOpacity>
                                <Text style={styles.qtyValueText}>{item.quantity}</Text>
                                <TouchableOpacity 
                                  onPress={() => updateQuantity(item.dbId, 1)}
                                  disabled={isPending}
                                  style={styles.qtyBtn}
                                >
                                  <FontAwesome5 name="plus" size={8} color="#059669" />
                                </TouchableOpacity>
                              </View>
                            </View>
                            
                            <View style={styles.priceActionArea}>
                              <View style={styles.priceInputWrapper}>
                                <Text style={styles.currencyPrefix}>฿</Text>
                                <TextInput 
  style={[styles.priceInput, isPending && { opacity: 0.4 }]} 
  placeholder="0.00"
  placeholderTextColor="#d1d5db" 
  keyboardType="decimal-pad"
  editable={!isPending}
  defaultValue={item.currentPrice > 0 ? item.currentPrice.toString() : ''}
  onBlur={(e: any) => handleSavePriceToDB(item.dbId, e.nativeEvent.text)}
  {...Platform.select({ web: { outlineStyle: 'none' } })}
/>
                              </View>
                              {item.currentPrice > 0 && (
                                <Text style={styles.totalHintText}>
                                  รวม ฿{(item.currentPrice * item.quantity).toLocaleString()}
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
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  header: { 
    paddingHorizontal: 24, 
    paddingTop: 0
,        // 🚩 ปรับเป็น 0 เพื่อให้ชิดขอบ Safe Area ที่สุด
    paddingBottom: 30,    // ระยะห่างก่อนถึงรายการแรก
    marginTop: -30,        // 🚩 ติดลบนิดๆ เพื่อดึงข้อมูลขึ้นไปอีก
  },
  headerLeft: { 
    flex: 1,
    justifyContent: 'flex-start',
  },
  dateText: { 
    fontSize: 12, 
    color: '#10b981', 
    fontWeight: 'bold', 
    textTransform: 'uppercase', 
    marginBottom: -20,     // 🚩 ใช้ค่าติดลบเพื่อให้ "รายการช้อปปิ้ง" ขยับขึ้นมาเกือบเกยกัน
    includeFontPadding: false, // สำหรับ Android ไม่ให้มีช่องว่างขอบตัวอักษร
  },
  greetingText: { 
    fontSize: 34,         // ขยายให้ใหญ่สะใจสไตล์ Apple Music
    fontWeight: '900', 
    color: '#1f2937',
    letterSpacing: -1.2,  // บีบระยะห่างระหว่างตัวอักษรให้ดู Modern
    lineHeight: 40,       // คุมระยะความสูงบรรทัด
    includeFontPadding: false,
  },

  // List Area
  listArea: { 
    paddingHorizontal: 20 
  },
  
  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIconBox: { width: 100, height: 100, backgroundColor: '#fff', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2 },
  emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 16, lineHeight: 24 },

  // Card Design
  storeCard: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    marginBottom: 20, 
    overflow: 'hidden',
    shadowColor: '#000', 
    shadowOpacity: 0.06, 
    shadowRadius: 15, 
    elevation: 4 
  },
  storeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: '#ecfdf5' 
  },
  storeTitleRow: { flexDirection: 'row', alignItems: 'center' },
  storeName: { fontWeight: '800', fontSize: 17, color: '#065f46' },

  aisleSection: { borderTopWidth: 1, borderTopColor: '#f9fafb' },
  aisleHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    paddingBottom: 5,
    backgroundColor: '#fff' 
  },
  aisleName: { fontSize: 11, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  aisleLine: { flex: 1, height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 10 },

  itemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 5, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f9fafb' 
  },
  itemRowPending: { backgroundColor: '#f0fdf4' },
  
  checkCircle: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    borderWidth: 2, 
    borderColor: '#10b981', 
    marginRight: 15, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  checkCircleChecked: { backgroundColor: '#10b981', borderColor: '#10b981' },
  
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, color: '#1f2937', fontWeight: '700', marginBottom: 2 },
  lastPriceText: { fontSize: 11, color: '#9ca3af', marginBottom: 8 },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#9ca3af', opacity: 0.5 },

  // Qty Controller
  qtyController: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { 
    width: 28, 
    height: 28, 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1.5, 
    borderColor: '#d1fae5' 
  },
  qtyValueText: { marginHorizontal: 12, fontSize: 15, fontWeight: '800', color: '#1f2937', minWidth: 20, textAlign: 'center' },

  // Price Area
  priceActionArea: { alignItems: 'flex-end' },
  priceInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    paddingHorizontal: 8
  },
  currencyPrefix: { fontSize: 12, color: '#9ca3af', fontWeight: 'bold' },
  priceInput: { 
    width: 60, 
    height: 40, 
    textAlign: 'right', 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#111827' 
  },
  totalHintText: { fontSize: 11, color: '#10b981', fontWeight: '800', marginTop: 4 }
});