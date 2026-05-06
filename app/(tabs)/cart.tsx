import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../services/db';
import { useShoppingStore } from '../../store/useShoppingStore';

export default function CartScreen() {
  const { fetchData } = useShoppingStore();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const fetchCart = async () => {
    try {
      const result: any[] = await db.getAllAsync(
        'SELECT id, name, last_price, current_price, quantity FROM items WHERE is_checked = 1'
      );
      setCartItems(result);
      
      const sum = result.reduce((acc, item) => {
        const priceToSum = (item.current_price || 0) > 0 ? item.current_price : (item.last_price || 0);
        return acc + (priceToSum * (item.quantity || 1));
      }, 0);
      
      setTotal(sum);
    } catch (error) {
      console.error("Fetch cart error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [])
  );

  const handleClearCart = async () => {
    Alert.alert('ยืนยันการจ่ายเงิน', 'บันทึกราคาและปิดรายการซื้อรอบนี้', [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ยืนยัน', 
        onPress: async () => {
          try {
            await db.runAsync(`
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
          } catch (error) {
            console.error("Clear cart error:", error);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ตะกร้าของฉัน</Text>
        <Text style={styles.count}>รายการทั้งหมด: {cartItems.length} รายการ</Text>
      </View>

      <ScrollView style={styles.list}>
        {cartItems.map((item) => {
          const isPriceNotEntered = (item.current_price || 0) === 0;
          const displayUnitPrice = isPriceNotEntered ? (item.last_price || 0) : item.current_price;
          const itemTotal = displayUnitPrice * (item.quantity || 1);
          
          const lastPrice = item.last_price || 0;
          const diffPerUnit = isPriceNotEntered ? 0 : (item.current_price - lastPrice);
          // ✅ คำนวณยอดเปลี่ยนแปลงรวม (Diff x Quantity)
          const totalDiff = diffPerUnit * (item.quantity || 1);
          const hasLastPrice = lastPrice > 0;

          return (
            <View key={item.id} style={styles.cartItem}>
              <View style={styles.itemInfo}>
                <View style={styles.nameRow}>
                   <Text style={styles.itemName}>{item.name}</Text>
                   {item.quantity > 1 && (
                     <Text style={styles.qtyText}>x{item.quantity}</Text>
                   )}
                   {/* ✅ 1. ส่วนต่างราคาต่อหน่วย ย้ายมาอยู่หลังชื่อ/จำนวน */}
                   {!isPriceNotEntered && hasLastPrice && diffPerUnit !== 0 && (
                     <Text style={[styles.unitDiffText, { color: diffPerUnit > 0 ? '#ef4444' : '#10b981' }]}>
                       {diffPerUnit > 0 ? ` (+${diffPerUnit.toFixed(2)})` : ` (${diffPerUnit.toFixed(2)})`}
                     </Text>
                   )}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={styles.itemSub}>
                    {item.quantity > 1 ? `${item.quantity} x ฿${displayUnitPrice.toFixed(2)} = ` : 'วันนี้: '}
                    <Text style={styles.priceHighlight}>฿{itemTotal.toFixed(2)}</Text>
                  </Text>

                  {/* ✅ 2. ยอดราคาเปลี่ยนแปลงรวม (Total Diff) ใส่ไว้หลังราคารวม */}
                  {!isPriceNotEntered && hasLastPrice && totalDiff !== 0 && (
                    <View style={[styles.diffBadge, { backgroundColor: totalDiff > 0 ? '#fee2e2' : '#dcfce7' }]}>
                      <Text style={[styles.diffBadgeText, { color: totalDiff > 0 ? '#ef4444' : '#15803d' }]}>
                        {totalDiff > 0 ? `+฿${totalDiff.toFixed(0)}` : `-฿${Math.abs(totalDiff).toFixed(0)}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <FontAwesome5 name="check-circle" size={20} color="#10b981" />
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>ยอดรวมที่ต้องจ่าย</Text>
          <Text style={styles.totalValue}>฿{total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleClearCart}>
          <Text style={styles.checkoutText}>ชำระเงินเสร็จสิ้น</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  count: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  list: { padding: 16 },
  cartItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  itemInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  qtyText: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginLeft: 6 },
  unitDiffText: { fontSize: 13, fontWeight: 'bold' },
  itemSub: { fontSize: 13, color: '#6b7280' },
  priceHighlight: { fontWeight: 'bold', color: '#111827', fontSize: 15 },
  // ✅ Style สำหรับ Badge บอกยอดรวมความเปลี่ยนแปลง
  diffBadge: { 
    marginLeft: 8, 
    paddingHorizontal: 6, 
    paddingVertical: 1, 
    borderRadius: 5 
  },
  diffBadgeText: { fontSize: 10, fontWeight: '800' },
  footer: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  totalLabel: { fontSize: 16, color: '#4b5563', fontWeight: '500' },
  totalValue: { fontSize: 26, fontWeight: 'bold', color: '#059669' },
  checkoutBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 12, alignItems: 'center' },
  checkoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});