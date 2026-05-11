import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  View
} from 'react-native';
import { getDB } from '../../services/db';
import { useShoppingStore } from '../../store/useShoppingStore';

// เปิดใช้งาน Animation สำหรับ Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ProductHistory {
  name: string;
  lastStore: string;
  lastAisle: string;
  lastPrice: number;
}

interface DBData {
  id: number;
  name: string;
}

export default function AddItemScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const fetchData = useShoppingStore((state) => state.fetchData);

  // States สำหรับข้อมูลในฟอร์ม
  const [itemName, setItemName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [aisleName, setAisleName] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [aisleSearch, setAisleSearch] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lastPriceHint, setLastPriceHint] = useState<number | null>(null);
  
  // States สำหรับข้อมูลจาก Database
  const [history, setHistory] = useState<ProductHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ProductHistory[]>([]);
  const [dbStores, setDbStores] = useState<DBData[]>([]);
  const [dbAisles, setDbAisles] = useState<DBData[]>([]);

  // UI States
  const [showHistory, setShowHistory] = useState(false);
  const [showStoreList, setShowStoreList] = useState(false);
  const [showAisleList, setShowAisleList] = useState(false);
  const [activeField, setActiveField] = useState<'item' | 'store' | 'aisle' | 'price' | 'qty' | null>(null);

  // โหลดข้อมูลเมื่อหน้าจอถูกโฟกัส
  useFocusEffect(
    useCallback(() => {
      loadAllData();
      return () => closeDropdowns();
    }, [])
  );

  // ตรวจสอบราคาล่าสุดอัตโนมัติเมื่อพิมพ์
  useEffect(() => {
    const currentItem = itemName.trim().toLowerCase();
    const currentStore = (storeName || storeSearch).trim().toLowerCase();
    const currentAisle = (aisleName || aisleSearch).trim().toLowerCase();

    if (currentItem && currentStore && currentAisle) {
      const match = history.find(h => 
        h.name.toLowerCase() === currentItem && 
        h.lastStore.toLowerCase() === currentStore && 
        h.lastAisle.toLowerCase() === currentAisle
      );
      setLastPriceHint(match ? match.lastPrice : null);
    } else {
      setLastPriceHint(null);
    }
  }, [itemName, storeName, storeSearch, aisleName, aisleSearch, history]);

  const clearInput = (type: 'item' | 'store' | 'aisle') => {
  if (type === 'item') {
    setItemName('');
    setShowHistory(false);
  } else if (type === 'store') {
    setStoreName('');
    setStoreSearch(''); // ล้างค่าค้นหาด้วย
    setShowStoreList(false);
  } else if (type === 'aisle') {
    setAisleName('');
    setAisleSearch(''); // ล้างค่าค้นหาด้วย
    setShowAisleList(false);
  }
};

  // ฟังก์ชันเลื่อนหน้าจอไปด้านล่างสุด
const scrollToBottom = () => {
  // ใช้ setTimeout นิดนึงเพื่อให้คีย์บอร์ดดันขึ้นมาเสร็จก่อน แล้วค่อยสั่งเลื่อน
  setTimeout(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, 100);
};

// ฟังก์ชันเลื่อนหน้าจอกลับไปด้านบนสุด
const scrollToTop = () => {
  scrollRef.current?.scrollTo({ y: 0, animated: true });
};

// ใช้ useEffect ตรวจจับตอนคีย์บอร์ดปิด (สำหรับคนกดจิ้มที่ว่างเพื่อเก็บแป้น)
useEffect(() => {
  const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
    scrollToTop();
    setActiveField(null); // เคลียร์สถานะช่องที่โฟกัสด้วย
  });

  return () => {
    keyboardHideListener.remove();
  };
}, []);

  const loadAllData = async () => {
    await loadProductHistory();
    await loadStoresAndAisles();
  };

  const loadStoresAndAisles = async () => {
  try {
    const database = getDB(); // 🚩 ดึง instance มาก่อน
    const stores: any[] = await database.getAllAsync('SELECT MIN(id) as id, name FROM stores GROUP BY name ORDER BY name ASC');
    setDbStores(stores);
    const aisles: any[] = await database.getAllAsync('SELECT MIN(id) as id, name FROM aisles GROUP BY name ORDER BY name ASC');
    setDbAisles(aisles);
  } catch (error) {
    console.error("Load stores/aisles error", error);
  }
};

const loadProductHistory = async () => {
  try {
    const database = getDB(); // 🚩 ดึง instance มาก่อน
    const result: any[] = await database.getAllAsync(`
      SELECT 
        TRIM(i.name) as name, 
        TRIM(s.name) as lastStore, 
        TRIM(a.name) as lastAisle, 
        i.last_price as lastPrice
      FROM items i
      LEFT JOIN stores s ON i.store_id = s.id
      LEFT JOIN aisles a ON i.aisle_id = a.id
      WHERE i.id IN (
        SELECT MAX(id) FROM items GROUP BY name, store_id 
      )
      ORDER BY i.name ASC, s.name ASC
    `);
    setHistory(result);
  } catch (error) {
    console.error("Load history error", error);
  }
};

  const handleItemNameChange = (text: string) => {
    setItemName(text);
    if (text.trim().length > 0) {
      const filtered = history.filter(h => 
        h.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredHistory(filtered);
      setShowHistory(filtered.length > 0);
    } else {
      setShowHistory(false);
    }
  };

  const selectFromHistory = (prod: ProductHistory) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItemName(prod.name);
    setStoreName(prod.lastStore);
    setAisleName(prod.lastAisle);
    setLastPriceHint(prod.lastPrice);
    setShowHistory(false);
    Keyboard.dismiss();
  };

  const adjustQty = (delta: number) => {
    const current = parseInt(quantity) || 1;
    const next = Math.max(1, current + delta);
    setQuantity(next.toString());
  };

  const closeDropdowns = () => {
    setShowStoreList(false);
    setShowAisleList(false);
    setShowHistory(false);
    setActiveField(null);
  };

  const resetForm = () => {
    setItemName('');
    setStoreName('');
    setAisleName('');
    setStoreSearch('');
    setAisleSearch('');
    setPrice('');
    setQuantity('1');
    setLastPriceHint(null);
    closeDropdowns();
    loadAllData();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    Keyboard.dismiss();
  };

  const handleSave = async () => {
  const finalStoreName = (storeName || storeSearch).trim();
  const finalAisleName = (aisleName || aisleSearch).trim();
  const finalItemName = itemName.trim();

  if (!finalItemName || !finalStoreName || !finalAisleName) {
    Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  try {
    const database = getDB(); // 🚩 ดึง instance มาก่อนครั้งเดียว

    // บันทึกร้านค้า
    await database.runAsync('INSERT OR IGNORE INTO stores (name) VALUES (?)', [finalStoreName]);
    const storeRes: any = await database.getFirstAsync('SELECT id FROM stores WHERE name = ?', [finalStoreName]);
    
    // บันทึกโซน
    await database.runAsync('INSERT OR IGNORE INTO aisles (name) VALUES (?)', [finalAisleName]);
    const aisleRes: any = await database.getFirstAsync('SELECT id FROM aisles WHERE name = ?', [finalAisleName]);

    // เช็คสินค้าซ้ำ
    const existingItem: any = await database.getFirstAsync(
      `SELECT id FROM items WHERE name = ? AND store_id = ? AND aisle_id = ? AND is_active = 1`,
      [finalItemName, storeRes.id, aisleRes.id]
    );

    const inputQty = parseInt(quantity) || 1;
    const inputPrice = price ? parseFloat(price) : (lastPriceHint || 0);

    if (existingItem) {
      await database.runAsync(
        `UPDATE items SET quantity = quantity + ?, last_price = ?, is_checked = 0 WHERE id = ?`,
        [inputQty, inputPrice, existingItem.id]
      );
    } else {
      await database.runAsync(
        `INSERT INTO items (store_id, aisle_id, name, last_price, current_price, quantity, is_checked, is_active) 
         VALUES (?, ?, ?, ?, 0, ?, 0, 1)`, 
        [storeRes.id, aisleRes.id, finalItemName, inputPrice, inputQty]
      );
    }

    await fetchData(); 
    resetForm();
    if (Platform.OS !== 'web') {
      Alert.alert('สำเร็จ', 'เพิ่มรายการเรียบร้อย');
    } else {
      console.log('Saved successfully');
    }
  } catch (error) {
    console.error(error);
    Alert.alert('Error', 'ไม่สามารถบันทึกได้');
  }
};

  const filteredStores = dbStores.filter(s => s.name.toLowerCase().includes(storeSearch.toLowerCase()));
  const filteredAisles = dbAisles.filter(a => a.name.toLowerCase().includes(aisleSearch.toLowerCase()));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <TouchableWithoutFeedback 
  onPress={() => { 
    Keyboard.dismiss();   // เก็บแป้นพิมพ์
    closeDropdowns();     // ปิดรายการที่เด้งลงมา (History/Store/Aisle)
    scrollToTop();        // เลื่อนหน้าจอกลับไปด้านบนสุด
  }}
>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>เพิ่มรายการใหม่</Text>
            <Text style={styles.subtitle}>เพิ่มของที่คุณต้องการช้อปวันนี้</Text>
          </View>

          <View style={styles.formCard}>
            {/* 1. ชื่อสินค้า */}
            <View style={[styles.inputGroup, { zIndex: 3000 }]}>
              <Text style={styles.label}>ชื่อสินค้า</Text>
              <View style={[styles.inputWrapper, activeField === 'item' && styles.inputWrapperActive]}>
                <FontAwesome5 name="shopping-basket" size={16} color={activeField === 'item' ? "#10b981" : "#9ca3af"} style={styles.icon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="ระบุชื่อสินค้า..." 
                  value={itemName} 
                  onChangeText={handleItemNameChange}
                  onFocus={() => setActiveField('item')}
                />
                {itemName.length > 0 && (
                  <TouchableOpacity onPress={() => setItemName('')}>
                    <FontAwesome5 name="times-circle" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                )}
              </View>
              
              {showHistory && (
                <View style={styles.dropdown}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 200 }}>
                    {filteredHistory.map((item, index) => (
                      <TouchableOpacity key={index} style={styles.dropdownItem} onPress={() => selectFromHistory(item)}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownText}>{item.name}</Text>
                          <Text style={styles.dropdownSubText}>{item.lastStore} • {item.lastAisle}</Text>
                        </View>
                        <Text style={styles.historyPrice}>฿{item.lastPrice.toFixed(0)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 2. ร้านค้า & โซน (เปลี่ยนจากแถวเดียวเป็นคนละบรรทัด) */}
<View style={[styles.inputGroup, { zIndex: 2000 }]}>
  <Text style={styles.label}>ร้านค้า</Text>
  <View style={[styles.inputWrapper, activeField === 'store' && styles.inputWrapperActive]}>
    <FontAwesome5 name="store" size={14} color={activeField === 'store' ? "#10b981" : "#9ca3af"} style={styles.icon} />
    <TextInput 
      style={styles.input} 
      placeholder="พิมพ์ชื่อร้านค้า เช่น Lotus, Big C, ตลาดสด..." 
      value={storeName || storeSearch} 
      onChangeText={(text) => { setStoreSearch(text); setStoreName(''); setShowStoreList(true); }}
      onFocus={() => { setShowStoreList(true); setActiveField('store'); scrollToBottom(); }}
    />
    {(storeName.length > 0 || storeSearch.length > 0) && (
      <TouchableOpacity onPress={() => clearInput('store')} style={styles.clearButton}>
        <FontAwesome5 name="times-circle" size={18} color="#d1d5db" />
      </TouchableOpacity>
    )}
  </View>
  {showStoreList && !storeName && filteredStores.length > 0 && (
    <View style={styles.dropdown}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 150 }}>
        {filteredStores.map(s => (
          <TouchableOpacity key={s.id} style={styles.dropdownItem} onPress={() => { setStoreName(s.name); setShowStoreList(false); Keyboard.dismiss(); }}>
            <Text style={styles.dropdownText}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )}
</View>

<View style={[styles.inputGroup, { zIndex: 1000 }]}>
  <Text style={styles.label}>โซนสินค้า / หมวดหมู่</Text>
  <View style={[styles.inputWrapper, activeField === 'aisle' && styles.inputWrapperActive]}>
    <FontAwesome5 name="layer-group" size={14} color={activeField === 'aisle' ? "#10b981" : "#9ca3af"} style={styles.icon} />
    <TextInput 
      style={styles.input} 
      placeholder="เช่น ของแห้ง, ตู้แช่, โซนเครื่องดื่ม..." 
      value={aisleName || aisleSearch} 
      onChangeText={(text) => { setAisleSearch(text); setAisleName(''); setShowAisleList(true); }}
      onFocus={() => { setShowAisleList(true); setActiveField('aisle'); scrollToBottom(); }}
    />
    {(aisleName.length > 0 || aisleSearch.length > 0) && (
      <TouchableOpacity onPress={() => clearInput('aisle')} style={styles.clearButton}>
        <FontAwesome5 name="times-circle" size={18} color="#d1d5db" />
      </TouchableOpacity>
    )}
  </View>
  {showAisleList && !aisleName && filteredAisles.length > 0 && (
    <View style={styles.dropdown}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 150 }}>
        {filteredAisles.map(a => (
          <TouchableOpacity key={a.id} style={styles.dropdownItem} onPress={() => { setAisleName(a.name); setShowAisleList(false); Keyboard.dismiss(); }}>
            <Text style={styles.dropdownText}>{a.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )}
</View>
            {/* 3. ราคา & จำนวน */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1.5, marginRight: 8 }]}>
                <Text style={styles.label}>ราคา/หน่วย</Text>
                <View style={[styles.inputWrapper, activeField === 'price' && styles.inputWrapperActive]}>
                  <Text style={styles.currency}>฿</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder={lastPriceHint ? `${lastPriceHint}` : "0.00"} 
                    keyboardType="numeric" 
                    value={price} 
                    onChangeText={setPrice}
                    onFocus={() => {
          setActiveField('price');
          scrollToBottom(); // 🚩 เพิ่มตรงนี้เพื่อให้ดันลงล่างสุด
        }}
                  />
                </View>
                {lastPriceHint && !price && (
                  <Text style={styles.hintText}>ราคาล่าสุดจากประวัติ</Text>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>จำนวน</Text>
                <View style={styles.qtyContainer}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(-1)}>
                    <FontAwesome5 name="minus" size={10} color="#10b981" />
                  </TouchableOpacity>
                  <TextInput 
                    style={styles.qtyInput} 
                    keyboardType="number-pad" 
                    value={quantity} 
                    onChangeText={setQuantity}
                    onFocus={() => {
          setActiveField('qty');
          scrollToBottom(); // 🚩 เพิ่มตรงนี้เพื่อให้ดันลงล่างสุด
        }}
                  />
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(1)}>
                    <FontAwesome5 name="plus" size={10} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, !itemName.trim() && styles.disabledButton]} 
              onPress={handleSave} 
              disabled={!itemName.trim()}
            >
              <FontAwesome5 name="plus" size={16} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.saveButtonText}>เพิ่มลงในรายการซื้อ</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ height: 100 }} /> 
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 24, marginTop: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#1f2937', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  
  clearButton: {
  padding: 8,
  justifyContent: 'center',
  alignItems: 'center',
},

  formCard: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 20, 
    elevation: 8 
  },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    borderWidth: 1.5, 
    borderColor: '#F3F4F6' 
  },
  inputWrapperActive: {
    borderColor: '#10b981',
    backgroundColor: '#fff',
  },
  
  icon: { marginRight: 12 },
  currency: { fontSize: 16, fontWeight: '700', color: '#10b981', marginRight: 8 },
  input: { flex: 1, height: 54, fontSize: 16, fontWeight: '600', color: '#1f2937' },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 },
  
  hintText: { fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: '600' },
  
  qtyContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 16, 
    height: 54,
    borderWidth: 1.5,
    borderColor: '#F3F4F6'
  },
  qtyBtn: { width: 35, height: 54, justifyContent: 'center', alignItems: 'center' },
  qtyInput: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#1f2937' },

  dropdown: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginTop: 8, 
    borderWidth: 1.5, 
    borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    position: 'absolute', top: 75, left: 0, right: 0, zIndex: 5000
  },
  dropdownItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F9FAFB', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  dropdownText: { fontSize: 16, color: '#1f2937', fontWeight: '700' },
  dropdownSubText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  historyPrice: { fontSize: 16, fontWeight: '800', color: '#10b981' },

  saveButton: { 
    backgroundColor: '#10b981', 
    height: 60, 
    borderRadius: 18, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 10,
    shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  disabledButton: { backgroundColor: '#E5E7EB', shadowOpacity: 0 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' }
});