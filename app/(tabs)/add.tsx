import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { db } from '../../services/db';
import { useShoppingStore } from '../../store/useShoppingStore';

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

  // States
  const [itemName, setItemName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [aisleName, setAisleName] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [aisleSearch, setAisleSearch] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lastPriceHint, setLastPriceHint] = useState<number | null>(null);
  
  // Data States
  const [history, setHistory] = useState<ProductHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ProductHistory[]>([]);
  const [dbStores, setDbStores] = useState<DBData[]>([]);
  const [dbAisles, setDbAisles] = useState<DBData[]>([]);

  // UI States
  const [showHistory, setShowHistory] = useState(false);
  const [showStoreList, setShowStoreList] = useState(false);
  const [showAisleList, setShowAisleList] = useState(false);
  const [activeField, setActiveField] = useState<'item' | 'store' | 'aisle' | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
      return () => closeDropdowns();
    }, [])
  );

  // ✅ 2. ตรวจสอบราคาล่าสุดอัตโนมัติ (แม้จะพิมพ์เอง)
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

      if (match) {
        setLastPriceHint(match.lastPrice);
      } else {
        setLastPriceHint(null);
      }
    } else {
      setLastPriceHint(null);
    }
  }, [itemName, storeName, storeSearch, aisleName, aisleSearch, history]);

  const loadAllData = async () => {
    await loadProductHistory();
    await loadStoresAndAisles();
  };

  const loadStoresAndAisles = async () => {
    try {
      const stores: any[] = await db.getAllAsync('SELECT MIN(id) as id, name FROM stores GROUP BY name ORDER BY name ASC');
      setDbStores(stores);
      const aisles: any[] = await db.getAllAsync('SELECT MIN(id) as id, name FROM aisles GROUP BY name ORDER BY name ASC');
      setDbAisles(aisles);
    } catch (error) {
      console.error("Load stores/aisles error", error);
    }
  };

  const loadProductHistory = async () => {
    try {
      const result: any[] = await db.getAllAsync(`
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
    setItemName(prod.name);
    setStoreName(prod.lastStore);
    setAisleName(prod.lastAisle);
    setLastPriceHint(prod.lastPrice);
    setShowHistory(false);
    Keyboard.dismiss();
  };

  const clearInput = (type: 'item' | 'store' | 'aisle') => {
    if (type === 'item') {
      setItemName('');
      setShowHistory(false);
    } else if (type === 'store') {
      setStoreName('');
      setStoreSearch('');
      setShowStoreList(false);
    } else if (type === 'aisle') {
      setAisleName('');
      setAisleSearch('');
      setShowAisleList(false);
    }
  };

  const filteredStores = dbStores.filter(s => s.name.toLowerCase().includes(storeSearch.toLowerCase()));
  const filteredAisles = dbAisles.filter(a => a.name.toLowerCase().includes(aisleSearch.toLowerCase()));

  const closeDropdowns = () => {
    setShowStoreList(false);
    setShowAisleList(false);
    setShowHistory(false);
    setActiveField(null);
  };

  const scrollToInput = (y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 100);
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
      // 1. จัดการข้อมูล Store และ Aisle เพื่อเอา ID (เหมือนเดิม)
      await db.runAsync('INSERT OR IGNORE INTO stores (name) VALUES (?)', [finalStoreName]);
      const storeRes: any = await db.getFirstAsync('SELECT id FROM stores WHERE name = ?', [finalStoreName]);
      
      await db.runAsync('INSERT OR IGNORE INTO aisles (name) VALUES (?)', [finalAisleName]);
      const aisleRes: any = await db.getFirstAsync('SELECT id FROM aisles WHERE name = ?', [finalAisleName]);

      if (!storeRes || !aisleRes) throw new Error("ID not found");

      // 2. 🔍 เช็คว่ามีสินค้า "ชื่อเดียวกัน + ร้านเดียวกัน + โซนเดียวกัน" อยู่ในรายการหรือไม่
      // เราจะเช็คเฉพาะรายการที่ยัง Active อยู่ (is_active = 1)
      const existingItem: any = await db.getFirstAsync(
        `SELECT id, quantity FROM items 
         WHERE name = ? AND store_id = ? AND aisle_id = ? AND is_active = 1`,
        [finalItemName, storeRes.id, aisleRes.id]
      );

      const inputQty = parseInt(quantity) || 1;
      const inputPrice = price ? parseFloat(price) : (lastPriceHint || 0);

      if (existingItem) {
        // ✅ กรณีเจอของซ้ำ: ให้ UPDATE จำนวนเพิ่มเข้าไป
        await db.runAsync(
          `UPDATE items 
           SET quantity = quantity + ?, 
               last_price = ?, 
               is_checked = 0 
           WHERE id = ?`,
          [inputQty, inputPrice, existingItem.id]
        );
        console.log(`Updated existing item: ${finalItemName}, added ${inputQty} more.`);
      } else {
        // ✨ กรณีไม่เจอ: ให้ INSERT เป็นรายการใหม่
        await db.runAsync(
          `INSERT INTO items (store_id, aisle_id, name, last_price, current_price, quantity, is_checked, is_active) 
           VALUES (?, ?, ?, ?, 0, ?, 0, 1)`, 
          [storeRes.id, aisleRes.id, finalItemName, inputPrice, inputQty]
        );
        console.log(`Inserted new item: ${finalItemName}`);
      }

      await fetchData(); 
      resetForm();
      Alert.alert('สำเร็จ', existingItem ? 'เพิ่มจำนวนสินค้าเรียบร้อย' : 'บันทึกข้อมูลเรียบร้อย');
    } catch (error) {
      console.error("Save Error:", error);
      Alert.alert('Error', 'ไม่สามารถบันทึกได้');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <TouchableWithoutFeedback onPress={closeDropdowns}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>เพิ่มรายการใหม่</Text>
            <Text style={styles.subtitle}>ระบบจะช่วยเช็คราคาล่าสุดให้อัตโนมัติ</Text>
          </View>

          <View style={styles.form}>
            {/* 1. ชื่อสินค้า */}
            <View style={[styles.inputGroup, { zIndex: 3000 }]}>
              <Text style={styles.label}>ชื่อสินค้า</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome5 name="shopping-bag" size={16} color="#10b981" style={styles.icon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="เช่น นมจืด, อกไก่" 
                  value={itemName} 
                  onChangeText={handleItemNameChange}
                  onFocus={() => setActiveField('item')}
                />
                {/* ✅ 1. กากบาทขึ้นเฉพาะตอนมีค่า + กำลังพิมพ์ */}
                {itemName.length > 0 && activeField === 'item' && (
                  <TouchableOpacity onPress={() => clearInput('item')} style={styles.clearButton}>
                    <FontAwesome5 name="times-circle" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                )}
              </View>
              {showHistory && (
                <View style={styles.dropdown}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 250 }}>
                    {filteredHistory.map((item, index) => (
                      <TouchableOpacity key={index} style={styles.dropdownItem} onPress={() => selectFromHistory(item)}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.dropdownText}>{item.name}</Text>
                            <View style={styles.storeTag}><Text style={styles.storeTagText}>{item.lastStore}</Text></View>
                          </View>
                          <Text style={styles.dropdownSubText}>โซน: {item.lastAisle}</Text>
                        </View>
                        <Text style={styles.historyPrice}>฿{item.lastPrice.toFixed(0)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 2. ร้านค้า */}
            <View style={[styles.inputGroup, { zIndex: 2000 }]}>
              <Text style={styles.label}>ร้านค้า</Text>
              <View style={[styles.inputWrapper, storeName ? styles.selectedWrapper : null]}>
                <FontAwesome5 name="store" size={16} color={storeName ? "#10b981" : "#9ca3af"} style={styles.icon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="ค้นหาหรือพิมพ์ชื่อร้าน..." 
                  value={storeName || storeSearch} 
                  onChangeText={(text) => { setStoreSearch(text); setStoreName(''); setShowStoreList(true); }}
                  onFocus={() => { setShowStoreList(true); setActiveField('store'); scrollToInput(50); }}
                />
                {/* ✅ กากบาทร้านค้า */}
                {(storeName.length > 0 || storeSearch.length > 0) && activeField === 'store' && (
                  <TouchableOpacity onPress={() => clearInput('store')} style={styles.clearButton}>
                    <FontAwesome5 name="times-circle" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                )}
              </View>
              {showStoreList && !storeName && filteredStores.length > 0 && (
                <View style={styles.dropdown}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 150 }}>
                    {filteredStores.map((item) => (
                      <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => { setStoreName(item.name); setShowStoreList(false); Keyboard.dismiss(); }}>
                        <Text style={styles.dropdownText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 3. โซนสินค้า */}
            <View style={[styles.inputGroup, { zIndex: 1000 }]}>
              <Text style={styles.label}>โซนสินค้า</Text>
              <View style={[styles.inputWrapper, aisleName ? styles.selectedWrapper : null]}>
                <FontAwesome5 name="layer-group" size={16} color={aisleName ? "#10b981" : "#9ca3af"} style={styles.icon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="เช่น ของแห้ง, ตู้แช่..." 
                  value={aisleName || aisleSearch} 
                  onChangeText={(text) => { setAisleSearch(text); setAisleName(''); setShowAisleList(true); }}
                  onFocus={() => { setShowAisleList(true); setActiveField('aisle'); scrollToInput(150); }}
                />
                {/* ✅ กากบาทโซน */}
                {(aisleName.length > 0 || aisleSearch.length > 0) && activeField === 'aisle' && (
                  <TouchableOpacity onPress={() => clearInput('aisle')} style={styles.clearButton}>
                    <FontAwesome5 name="times-circle" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                )}
              </View>
              {showAisleList && !aisleName && filteredAisles.length > 0 && (
                <View style={styles.dropdown}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 150 }}>
                    {filteredAisles.map((item) => (
                      <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => { setAisleName(item.name); setShowAisleList(false); Keyboard.dismiss(); }}>
                        <Text style={styles.dropdownText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ส่วนราคาและจำนวน */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 10 }]}>
                <Text style={styles.label}>ราคาต่อหน่วย</Text>
                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={styles.input} 
                    placeholder={lastPriceHint ? `ล่าสุด ฿${lastPriceHint}` : "0.00"} 
                    keyboardType="numeric" 
                    value={price} 
                    onChangeText={setPrice} 
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>จำนวน</Text>
                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={[styles.input, { textAlign: 'center' }]} 
                    keyboardType="number-pad" 
                    value={quantity} 
                    onChangeText={setQuantity}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, (!itemName.trim() || !(storeName || storeSearch).trim() || !(aisleName || aisleSearch).trim()) && styles.disabledButton]} 
              onPress={handleSave} 
              disabled={!itemName.trim() || !(storeName || storeSearch).trim() || !(aisleName || aisleSearch).trim()}
            >
              <Text style={styles.saveButtonText}>เพิ่มรายการ</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 100 }} /> 
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContainer: { padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  form: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  inputGroup: { marginBottom: 16, position: 'relative' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  selectedWrapper: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  icon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 15, color: '#1f2937' },
  clearButton: { padding: 8, marginRight: -4 },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 4, position: 'absolute', top: 72, left: 0, right: 0, zIndex: 5000, elevation: 5 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 15, color: '#1f2937', fontWeight: '600' },
  dropdownSubText: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  storeTag: { backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  storeTagText: { fontSize: 10, color: '#0369a1', fontWeight: 'bold' },
  historyPrice: { fontSize: 15, fontWeight: 'bold', color: '#059669' },
  saveButton: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  disabledButton: { backgroundColor: '#d1d5db' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});