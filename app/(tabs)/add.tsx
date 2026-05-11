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
import { getDB, initDatabase } from '../../services/db';
import { useShoppingStore } from '../../store/useShoppingStore';

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

  const [itemName, setItemName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [aisleName, setAisleName] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [aisleSearch, setAisleSearch] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lastPriceHint, setLastPriceHint] = useState<number | null>(null);
  
  const [history, setHistory] = useState<ProductHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ProductHistory[]>([]);
  const [dbStores, setDbStores] = useState<DBData[]>([]);
  const [dbAisles, setDbAisles] = useState<DBData[]>([]);

  const [showHistory, setShowHistory] = useState(false);
  const [showStoreList, setShowStoreList] = useState(false);
  const [showAisleList, setShowAisleList] = useState(false);
  const [activeField, setActiveField] = useState<'item' | 'store' | 'aisle' | 'price' | 'qty' | null>(null);

  const [isDbReady, setIsDbReady] = useState(false); // 🚩 เพิ่มตัวแปรนี้

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const prepare = async () => {
        try {
          await initDatabase(); // ปลอดภัยแล้วเพราะเราแก้ใน db.ts แล้ว
          if (isMounted) {
            setIsDbReady(true);
            await loadAllData();
          }
        } catch (e) {
          console.error(e);
        }
      };

      prepare();
      return () => {
        isMounted = false;
        closeDropdowns();
      };
    }, [])
  );

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
      setStoreSearch('');
      setShowStoreList(false);
    } else if (type === 'aisle') {
      setAisleName('');
      setAisleSearch('');
      setShowAisleList(false);
    }
  };

  const scrollToBottom = () => {
    if (Platform.OS === 'web') return;
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const scrollToTop = () => {
    if (Platform.OS === 'web') return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      scrollToTop();
      setActiveField(null);
    });
    return () => keyboardHideListener.remove();
  }, []);

  const loadAllData = async () => {
    await loadProductHistory();
    await loadStoresAndAisles();
  };

  const loadStoresAndAisles = async () => {
    try {
      const database = getDB();
      const stores: any[] = await database.getAllAsync('SELECT MIN(id) as id, name FROM stores GROUP BY name ORDER BY name ASC');
      setDbStores(stores);
      const aisles: any[] = await database.getAllAsync('SELECT MIN(id) as id, name FROM aisles GROUP BY name ORDER BY name ASC');
      setDbAisles(aisles);
    } catch (error) {
      console.error("Load error", error);
    }
  };

  const loadProductHistory = async () => {
    try {
      const database = getDB();
      const result: any[] = await database.getAllAsync(`
        SELECT TRIM(i.name) as name, TRIM(s.name) as lastStore, TRIM(a.name) as lastAisle, i.last_price as lastPrice
        FROM items i
        LEFT JOIN stores s ON i.store_id = s.id
        LEFT JOIN aisles a ON i.aisle_id = a.id
        WHERE i.id IN (SELECT MAX(id) FROM items GROUP BY name, store_id)
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
    setItemName(''); setStoreName(''); setAisleName(''); setStoreSearch('');
    setAisleSearch(''); setPrice(''); setQuantity('1'); setLastPriceHint(null);
    closeDropdowns(); loadAllData(); scrollToTop(); Keyboard.dismiss();
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
      const database = getDB();

      // 1. จัดการร้านค้า (Stores)
      await database.runAsync('INSERT OR IGNORE INTO stores (name) VALUES (?)', [finalStoreName]);
      const storeRes: any = await database.getFirstAsync('SELECT id FROM stores WHERE name = ?', [finalStoreName]);
      
      // 2. จัดการโซน (Aisles) - 🚩 ปรับตรงนี้ให้ชัวร์ขึ้น
      await database.runAsync('INSERT OR IGNORE INTO aisles (name) VALUES (?)', [finalAisleName]);
      const aisleRes: any = await database.getFirstAsync('SELECT id FROM aisles WHERE name = ?', [finalAisleName]);

      if (!storeRes || !aisleRes) {
        throw new Error("Failed to get Store or Aisle ID");
      }

      const inputQty = parseInt(quantity) || 1;
      const inputPrice = price ? parseFloat(price) : (lastPriceHint || 0);

      // 3. ตรวจสอบสินค้าเดิม (รวมถึงเช็ค aisle_id ด้วย)
      const existingItem: any = await database.getFirstAsync(
        `SELECT id FROM items WHERE name = ? AND store_id = ? AND aisle_id = ? AND is_active = 1`,
        [finalItemName, storeRes.id, aisleRes.id]
      );

      if (existingItem) {
        // อัปเดตรายการเดิม
        await database.runAsync(
          `UPDATE items SET quantity = quantity + ?, last_price = ?, is_checked = 0 WHERE id = ?`,
          [inputQty, inputPrice, existingItem.id]
        );
      } else {
        // เพิ่มรายการใหม่ - 🚩 มั่นใจว่าส่ง aisleRes.id เข้าไปในคอลัมน์ที่ 2
        await database.runAsync(
          `INSERT INTO items (store_id, aisle_id, name, last_price, current_price, quantity, is_checked, is_active) 
           VALUES (?, ?, ?, ?, 0, ?, 0, 1)`, 
          [storeRes.id, aisleRes.id, finalItemName, inputPrice, inputQty]
        );
      }

      await fetchData(); 
      resetForm();
      if (Platform.OS !== 'web') Alert.alert('สำเร็จ', 'เพิ่มรายการเรียบร้อย');
      else console.log("✅ Saved with Aisle ID:", aisleRes.id);
      
    } catch (error) {
      console.error("❌ Save Error:", error);
      Alert.alert('Error', 'ไม่สามารถบันทึกได้');
    }
  };

  const filteredStores = dbStores.filter(s => s.name.toLowerCase().includes(storeSearch.toLowerCase()));
  const filteredAisles = dbAisles.filter(a => a.name.toLowerCase().includes(aisleSearch.toLowerCase()));

  // ฟังก์ชันแสดงเนื้อหาฟอร์ม (แยกออกมาเพื่อเรียกใช้ซ้ำ)
  const renderFormContent = () => (
    <>
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
              placeholderTextColor="#9ca3af"
              value={itemName} 
              onChangeText={handleItemNameChange}
              onFocus={() => setActiveField('item')}
            />
            {itemName.length > 0 && (
              <TouchableOpacity onPress={() => clearInput('item')}>
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

        {/* 2. ร้านค้า */}
        <View style={[styles.inputGroup, { zIndex: 2000 }]}>
          <Text style={styles.label}>ร้านค้า</Text>
          <View style={[styles.inputWrapper, activeField === 'store' && styles.inputWrapperActive]}>
            <FontAwesome5 name="store" size={14} color={activeField === 'store' ? "#10b981" : "#9ca3af"} style={styles.icon} />
            <TextInput 
              style={styles.input} 
              placeholder="พิมพ์ชื่อร้านค้า..." 
              placeholderTextColor="#9ca3af"
              value={storeName || storeSearch} 
              onChangeText={(text) => { setStoreSearch(text); setStoreName(''); setShowStoreList(true); }}
              onFocus={() => { setShowStoreList(true); setActiveField('store'); scrollToBottom(); }}
            />
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

        {/* 3. โซนสินค้า */}
        <View style={[styles.inputGroup, { zIndex: 1000 }]}>
          <Text style={styles.label}>โซนสินค้า / หมวดหมู่</Text>
          <View style={[styles.inputWrapper, activeField === 'aisle' && styles.inputWrapperActive]}>
            <FontAwesome5 name="layer-group" size={14} color={activeField === 'aisle' ? "#10b981" : "#9ca3af"} style={styles.icon} />
            <TextInput 
              style={styles.input} 
              placeholder="ระบุโซน..." 
              placeholderTextColor="#9ca3af"
              value={aisleName || aisleSearch} 
              onChangeText={(text) => { setAisleSearch(text); setAisleName(''); setShowAisleList(true); }}
              onFocus={() => { setShowAisleList(true); setActiveField('aisle'); scrollToBottom(); }}
            />
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
        
        {/* 4. ราคา & จำนวน */}
        <View style={[styles.row, { marginBottom: 20 }]}>
          {/* ช่องราคา */}
          <View style={{ flex: 1.5, marginRight: 12 }}>
            <Text style={styles.label}>ราคา/หน่วย</Text>
            <View style={[styles.inputWrapper, activeField === 'price' && styles.inputWrapperActive]}>
              <Text style={styles.currency}>฿</Text>
              <TextInput 
                style={styles.input} 
                placeholder={lastPriceHint ? `${lastPriceHint}` : "0.00"} 
                placeholderTextColor="#9ca3af"
                keyboardType="numeric" 
                value={price} 
                onChangeText={setPrice}
                onFocus={() => { setActiveField('price'); scrollToBottom(); }}
              />
            </View>
          </View>

          {/* ช่องจำนวน - ปรับปรุงโครงสร้างใหม่ */}
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>จำนวน</Text>
            <View style={styles.qtyContainer}>
              <TouchableOpacity 
                style={styles.qtyBtn} 
                onPress={() => adjustQty(-1)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="minus" size={12} color="#10b981" />
              </TouchableOpacity>
              
              <TextInput 
                style={styles.qtyInput} 
                keyboardType="number-pad" 
                value={quantity} 
                onChangeText={setQuantity}
                onFocus={() => { setActiveField('qty'); scrollToBottom(); }}
                selectTextOnFocus
              />
              
              <TouchableOpacity 
                style={styles.qtyBtn} 
                onPress={() => adjustQty(1)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="plus" size={12} color="#10b981" />
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
    </>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        // บน Web: ไม่ใช้ TouchableWithoutFeedback และ KeyboardAvoidingView
        <ScrollView 
          ref={scrollRef} 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          {renderFormContent()}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        // บน Mobile: ใช้ตามปกติ
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); closeDropdowns(); scrollToTop(); }}>
            <ScrollView 
              ref={scrollRef} 
              contentContainerStyle={styles.scrollContainer} 
              keyboardShouldPersistTaps="handled" 
              showsVerticalScrollIndicator={false}
            >
              {renderFormContent()}
              <View style={{ height: 100 }} />
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 24, marginTop: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#1f2937', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  formCard: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 20, 
    elevation: 8 
  },
  inputGroup: { 
    marginBottom: 20,
    // เอา flex ออกจากตรงนี้เพื่อให้ label ไม่เบี้ยว
  },
  label: { fontSize: 11, fontWeight: '800', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  row: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', // ปรับให้ชิดล่างเพื่อให้ Label ตรงกัน
    width: '100%',
  },
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
  input: { 
    flex: 1, 
    height: 54, 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1f2937',
    ...Platform.select({ web: { outlineStyle: 'none' } })
  },
  qtyContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 16, 
    height: 54, // ความสูงเท่ากับช่องราคา
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    overflow: 'hidden', // กันเนื้อหาหลุดขอบ
  },

  qtyBtn: { 
    width: 40, 
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // แยกสีปุ่มให้เห็นชัด
  },

  qtyInput: { 
    flex: 1, 
    textAlign: 'center', 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1f2937',
    paddingVertical: 0, // ลบ Padding ที่ทำให้ Cursor เบี้ยว
    margin: 0,
    minWidth: 40,
    ...Platform.select({ 
        web: { outlineStyle: 'none' } 
    }) 
  },
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