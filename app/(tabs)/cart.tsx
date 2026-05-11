import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDB, initDatabase } from '../../services/db'; // 🚩 เพิ่ม initDatabase
import { useShoppingStore } from '../../store/useShoppingStore';

export default function CartScreen() {
  const cartItems = useShoppingStore((state) => state.cartItems);
  const fetchCart = useShoppingStore((state) => state.fetchCart);
  const fetchData = useShoppingStore((state) => state.fetchData);

  const [total, setTotal] = useState(0);
  const [isDbReady, setIsDbReady] = useState(false);

  // เตรียมความพร้อมของ DB
  useFocusEffect(
    useCallback(() => {
      const prepare = async () => {
        try {
          await initDatabase();
          setIsDbReady(true);
          await fetchCart();
        } catch (e) {
          console.error(e);
        }
      };
      prepare();
    }, [fetchCart])
  );

  useEffect(() => {
    const sum = cartItems.reduce((acc, item) => {
      const priceToSum = (item.current_price || 0) > 0 ? item.current_price : (item.last_price || 0);
      return acc + (priceToSum * (item.quantity || 1));
    }, 0);
    setTotal(sum);
  }, [cartItems]);

  // ฟังก์ชันจัดการการจ่ายเงิน (Logic หลักแยกออกมาเพื่อให้เรียกใช้ได้ทั้ง 2 Platform)
  const processCheckout = async () => {
    if (!isDbReady) return;
    try {
      const database = getDB();
      await database.runAsync(`
        UPDATE items 
        SET last_price = CASE 
                           WHEN current_price > 0 THEN current_price 
                           ELSE last_price 
                         END, 
            is_checked = 0, 
            is_active = 0, 
            current_price = 0 
        WHERE is_checked = 1
      `);

      await fetchCart();
      await fetchData();

      if (Platform.OS === 'web') {
        alert("บันทึกประวัติการซื้อเรียบร้อยแล้ว");
      } else {
        Alert.alert("สำเร็จ", "บันทึกประวัติการซื้อเรียบร้อยแล้ว");
      }
    } catch (error) {
      console.error("Clear cart error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleClearCart = () => {
    const confirmMsg = 'บันทึกราคาล่าสุดและเคลียร์ตะกร้าสำหรับรอบถัดไป?';

    if (Platform.OS === 'web') {
      // 🚩 บน Web ใช้ window.confirm แทน Alert.alert
      if (window.confirm(confirmMsg)) {
        processCheckout();
      }
    } else {
      // บน Mobile ใช้ Alert.alert ปกติ
      Alert.alert('ยืนยันการจ่ายเงิน', confirmMsg, [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ยืนยัน', onPress: processCheckout }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.dateText}>ตรวจสอบรายการ</Text>
        <Text style={styles.title}>ตะกร้าของฉัน</Text>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
               <FontAwesome5 name="shopping-basket" size={40} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>ตะกร้ายังว่างอยู่</Text>
            <Text style={styles.emptySub}>ติ๊กเลือกสินค้าจากหน้าหลักเพื่อนำมาใส่ในนี้</Text>
          </View>
        ) : (
          cartItems.map((item) => {
            const isPriceNotEntered = (item.current_price || 0) === 0;
            const displayUnitPrice = isPriceNotEntered ? (item.last_price || 0) : item.current_price;
            const itemTotal = displayUnitPrice * (item.quantity || 1);
            const lastPrice = item.last_price || 0;
            const diffPerUnit = isPriceNotEntered ? 0 : (item.current_price - lastPrice);
            const totalDiff = diffPerUnit * (item.quantity || 1);

            return (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.itemInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.quantity > 1 && (
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>x{item.quantity}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.priceDetailRow}>
                    <Text style={styles.itemSub}>
                      {item.quantity > 1 ? `${item.quantity} x ฿${displayUnitPrice.toLocaleString()} = ` : 'ราคา: '}
                      <Text style={styles.priceHighlight}>฿{itemTotal.toLocaleString()}</Text>
                    </Text>

                    {!isPriceNotEntered && lastPrice > 0 && totalDiff !== 0 && (
                      <View style={[styles.diffBadge, { backgroundColor: totalDiff > 0 ? '#fee2e2' : '#dcfce7' }]}>
                        <FontAwesome5 
                          name={totalDiff > 0 ? "arrow-up" : "arrow-down"} 
                          size={8} 
                          color={totalDiff > 0 ? "#ef4444" : "#059669"} 
                          style={{marginRight: 4}}
                        />
                        <Text style={[styles.diffBadgeText, { color: totalDiff > 0 ? '#ef4444' : '#059669' }]}>
                          ฿{Math.abs(totalDiff).toFixed(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.checkIconBox}>
                   <FontAwesome5 name="check-circle" size={24} color="#10b981" />
                </View>
              </View>
            );
          })
        )}
        <View style={{height: 120}} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
            <View>
                <Text style={styles.totalLabel}>รวมทั้งสิ้น</Text>
                <Text style={styles.itemCountText}>{cartItems.length} รายการ</Text>
            </View>
            <Text style={styles.totalValue}>฿{total.toLocaleString(undefined, {minimumFractionDigits: 2})}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.checkoutBtn, { opacity: (cartItems.length === 0 || !isDbReady) ? 0.5 : 1 }]} 
          onPress={handleClearCart}
          disabled={cartItems.length === 0 || !isDbReady}
        >
          <Text style={styles.checkoutText}>ชำระเงินเสร็จสิ้น</Text>
          <FontAwesome5 name="arrow-right" size={16} color="#fff" style={{marginLeft: 12}} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ... styles เดิมของคุณทั้งหมด (ไม่ต้องแก้ไข) ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    paddingHorizontal: 24, 
    paddingTop: 0, 
    paddingBottom: 20,
    marginTop: 10
  },
  dateText: { fontSize: 12, color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: -4 },
  title: { fontSize: 34, fontWeight: '900', color: '#1f2937', letterSpacing: -1.2 },
  scrollArea: { paddingHorizontal: 20 },
  cartItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 20, 
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  itemInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemName: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  qtyBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  qtyText: { fontSize: 12, fontWeight: '800', color: '#6b7280' },
  priceDetailRow: { flexDirection: 'row', alignItems: 'center' },
  itemSub: { fontSize: 14, color: '#9ca3af' },
  priceHighlight: { fontWeight: '800', color: '#111827', fontSize: 16 },
  diffBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10, 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8 
  },
  diffBadgeText: { fontSize: 11, fontWeight: '900' },
  checkIconBox: { marginLeft: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIconBox: { width: 80, height: 80, backgroundColor: '#fff', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  footer: { 
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 24, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#f3f4f6',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10
  },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { fontSize: 14, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase' },
  itemCountText: { fontSize: 12, color: '#10b981', fontWeight: 'bold' },
  totalValue: { fontSize: 28, fontWeight: '900', color: '#10b981' },
  checkoutBtn: { 
    backgroundColor: '#10b981', 
    height: 60, 
    borderRadius: 18, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }
  },
  checkoutText: { color: '#fff', fontSize: 18, fontWeight: '800' }
});