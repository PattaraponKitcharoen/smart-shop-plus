import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
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

export default function PriceCalculatorScreen() {
  // ข้อมูลสินค้าชุดที่ 1
  const [price1, setPrice1] = useState('');
  const [qty1, setQty1] = useState('');
  
  // ข้อมูลสินค้าชุดที่ 2
  const [price2, setPrice2] = useState('');
  const [qty2, setQty2] = useState('');

  // คำนวณราคาต่อหน่วย
  const unitPrice1 = (parseFloat(price1) && parseFloat(qty1)) ? parseFloat(price1) / parseFloat(qty1) : 0;
  const unitPrice2 = (parseFloat(price2) && parseFloat(qty2)) ? parseFloat(price2) / parseFloat(qty2) : 0;

  // หาฝั่งที่ถูกกว่า
  const getComparison = () => {
    if (unitPrice1 === 0 || unitPrice2 === 0) return null;
    
    if (unitPrice1 < unitPrice2) {
      const diff = unitPrice2 - unitPrice1;
      return { winner: 1, diff };
    } else if (unitPrice2 < unitPrice1) {
      const diff = unitPrice1 - unitPrice2;
      return { winner: 2, diff };
    }
    return { winner: 0, diff: 0 }; // เท่ากัน
  };

  const result = getComparison();

  const reset = () => {
    setPrice1('');
    setQty1('');
    setPrice2('');
    setQty2('');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>เครื่องคิดเลขคุ้มค่า</Text>
            <Text style={styles.subtitle}>เปรียบเทียบราคาต่อหน่วยให้เห็นชัดๆ</Text>
          </View>

          <View style={styles.comparisonGrid}>
            {/* สินค้าชุดที่ 1 */}
            <View style={[styles.card, result?.winner === 1 && styles.winnerCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>แบบที่ 1</Text>
                {result?.winner === 1 && <FontAwesome5 name="crown" size={16} color="#fbbf24" />}
              </View>
              
              <Text style={styles.label}>ราคารวม (฿)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={price1}
                onChangeText={setPrice1}
              />
              
              <Text style={styles.label}>จำนวน (ชิ้น/ขวด)</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                value={qty1}
                onChangeText={setQty1}
              />

              <View style={styles.unitPriceBox}>
                <Text style={styles.unitPriceLabel}>เฉลี่ยหน่วยละ</Text>
                <Text style={styles.unitPriceValue}>฿ {unitPrice1.toFixed(2)}</Text>
              </View>
            </View>

            {/* สินค้าชุดที่ 2 */}
            <View style={[styles.card, result?.winner === 2 && styles.winnerCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>แบบที่ 2</Text>
                {result?.winner === 2 && <FontAwesome5 name="crown" size={16} color="#fbbf24" />}
              </View>
              
              <Text style={styles.label}>ราคารวม (฿)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={price2}
                onChangeText={setPrice2}
              />
              
              <Text style={styles.label}>จำนวน (ชิ้น/ขวด)</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                value={qty2}
                onChangeText={setQty2}
              />

              <View style={styles.unitPriceBox}>
                <Text style={styles.unitPriceLabel}>เฉลี่ยหน่วยละ</Text>
                <Text style={styles.unitPriceValue}>฿ {unitPrice2.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* ส่วนแสดงผลสรุป */}
          {result && result.winner !== 0 && (
            <View style={styles.resultBanner}>
              <FontAwesome5 name="check-circle" size={24} color="#fff" />
              <View style={styles.resultTextContainer}>
                <Text style={styles.resultTextMain}>
                  แบบที่ {result.winner} คุ้มกว่า!
                </Text>
                <Text style={styles.resultTextSub}>
                  ประหยัดไปได้หน่วยละ ฿{result.diff.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {result?.winner === 0 && unitPrice1 > 0 && (
            <View style={[styles.resultBanner, { backgroundColor: '#6b7280' }]}>
              <Text style={styles.resultTextMain}>ราคาเท่ากันเลย!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>ล้างข้อมูล</Text>
          </TouchableOpacity>

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 24, marginTop: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 4 },
  comparisonGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    width: '48%', 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  winnerCard: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: { 
    backgroundColor: '#F3F4F6', 
    borderRadius: 8, 
    padding: 10, 
    fontSize: 16, 
    marginBottom: 12,
    color: '#1f2937',
    fontWeight: '600'
  },
  unitPriceBox: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  unitPriceLabel: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  unitPriceValue: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginTop: 2 },
  resultBanner: { 
    backgroundColor: '#10b981', 
    borderRadius: 16, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 20
  },
  resultTextContainer: { marginLeft: 15 },
  resultTextMain: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultTextSub: { color: '#ecfdf5', fontSize: 14, marginTop: 2 },
  resetButton: { padding: 15, alignItems: 'center' },
  resetButtonText: { color: '#ef4444', fontWeight: '600', fontSize: 15 }
});