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
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PriceCalculatorScreen() {
  const [price1, setPrice1] = useState('');
  const [qty1, setQty1] = useState('');
  const [price2, setPrice2] = useState('');
  const [qty2, setQty2] = useState('');

  const unitPrice1 = (parseFloat(price1) && parseFloat(qty1)) ? parseFloat(price1) / parseFloat(qty1) : 0;
  const unitPrice2 = (parseFloat(price2) && parseFloat(qty2)) ? parseFloat(price2) / parseFloat(qty2) : 0;

  const getComparison = () => {
    if (unitPrice1 === 0 || unitPrice2 === 0) return null;
    if (unitPrice1 < unitPrice2) {
      return { winner: 1, diff: unitPrice2 - unitPrice1, percent: ((unitPrice2 - unitPrice1) / unitPrice2) * 100 };
    } else if (unitPrice2 < unitPrice1) {
      return { winner: 2, diff: unitPrice1 - unitPrice2, percent: ((unitPrice1 - unitPrice2) / unitPrice1) * 100 };
    }
    return { winner: 0, diff: 0, percent: 0 };
  };

  const result = getComparison();

  const reset = () => {
    setPrice1(''); setQty1('');
    setPrice2(''); setQty2('');
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            
            <View style={styles.header}>
              <Text style={styles.dateText}></Text>
              <Text style={styles.title}>เครื่องคิดเลขคุ้มค่า</Text>
              <Text style={styles.subtitle}>กรอกราคาเพื่อหาตัวเลือกที่ประหยัดที่สุด</Text>
            </View>

            <View style={styles.comparisonGrid}>
              {/* แบบที่ 1 */}
              <View style={[styles.card, result?.winner === 1 && styles.winnerCard]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, result?.winner === 1 && styles.winnerText]}>แบบที่ 1</Text>
                  {result?.winner === 1 && <FontAwesome5 name="medal" size={18} color="#10b981" />}
                </View>
                
                <View style={styles.inputBox}>
                  <Text style={styles.label}>ราคาทั้งหมด</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={price1}
                    onChangeText={setPrice1}
                  />
                </View>
                
                <View style={styles.inputBox}>
                  <Text style={styles.label}>ปริมาณ/จำนวน</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    keyboardType="decimal-pad"
                    value={qty1}
                    onChangeText={setQty1}
                  />
                </View>

                <View style={[styles.unitPriceBox, result?.winner === 1 && styles.winnerUnitBox]}>
                  <Text style={styles.unitPriceLabel}>เฉลี่ยต่อหน่วย</Text>
                  <Text style={styles.unitPriceValue}>฿{unitPrice1.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                </View>
              </View>

              {/* แบบที่ 2 */}
              <View style={[styles.card, result?.winner === 2 && styles.winnerCard]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, result?.winner === 2 && styles.winnerText]}>แบบที่ 2</Text>
                  {result?.winner === 2 && <FontAwesome5 name="medal" size={18} color="#10b981" />}
                </View>
                
                <View style={styles.inputBox}>
                  <Text style={styles.label}>ราคาทั้งหมด</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={price2}
                    onChangeText={setPrice2}
                  />
                </View>
                
                <View style={styles.inputBox}>
                  <Text style={styles.label}>ปริมาณ/จำนวน</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    keyboardType="decimal-pad"
                    value={qty2}
                    onChangeText={setQty2}
                  />
                </View>

                <View style={[styles.unitPriceBox, result?.winner === 2 && styles.winnerUnitBox]}>
                  <Text style={styles.unitPriceLabel}>เฉลี่ยต่อหน่วย</Text>
                  <Text style={styles.unitPriceValue}>฿{unitPrice2.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                </View>
              </View>
            </View>

            {/* ผลลัพธ์สรุป */}
            {result && result.winner !== 0 && (
              <View style={styles.resultBanner}>
                <View style={styles.iconCircle}>
                  <FontAwesome5 name="grin-stars" size={24} color="#10b981" />
                </View>
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultTextMain}>แบบที่ {result.winner} คุ้มกว่าเห็นๆ!</Text>
                  <Text style={styles.resultTextSub}>
                    ประหยัดไปได้หน่วยละ ฿{result.diff.toFixed(2)} ({result.percent.toFixed(1)}%)
                  </Text>
                </View>
              </View>
            )}

            {result?.winner === 0 && unitPrice1 > 0 && (
              <View style={[styles.resultBanner, { backgroundColor: '#6b7280' }]}>
                <FontAwesome5 name="equals" size={20} color="#fff" />
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultTextMain}>ราคาเท่ากันเป๊ะ!</Text>
                  <Text style={styles.resultTextSub}>เลือกแบบไหนก็ได้ตามใจชอบเลย</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={reset}>
              <FontAwesome5 name="redo" size={14} color="#ef4444" style={{marginRight: 8}} />
              <Text style={styles.resetButtonText}>ล้างข้อมูลทั้งหมด</Text>
            </TouchableOpacity>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingVertical: 10, marginBottom: 10, marginTop: 20 },
  dateText: { fontSize: 12, color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 },
  title: { fontSize: 34, fontWeight: '900', color: '#1f2937', letterSpacing: -1.2 },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 4, fontWeight: '500' },
  
  comparisonGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 20, 
    width: '48.5%', 
    shadowColor: '#000', 
    shadowOpacity: 0.06, 
    shadowRadius: 15, 
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  winnerCard: { borderColor: '#10b981', backgroundColor: '#fff' },
  winnerText: { color: '#059669' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#374151' },
  
  inputBox: { marginBottom: 12 },
  label: { fontSize: 11, color: '#9ca3af', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  input: { 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    padding: 12, 
    fontSize: 18, 
    color: '#111827',
    fontWeight: '800',
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  
  unitPriceBox: { 
    marginTop: 10, 
    paddingTop: 15, 
    borderTopWidth: 1, 
    borderTopColor: '#F3F4F6',
    alignItems: 'center'
  },
  winnerUnitBox: { borderTopColor: '#d1fae5' },
  unitPriceLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase' },
  unitPriceValue: { fontSize: 20, fontWeight: '900', color: '#111827', marginTop: 4 },

  resultBanner: { 
    backgroundColor: '#10b981', 
    borderRadius: 24, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10b981', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }
  },
  iconCircle: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  resultTextContainer: { marginLeft: 15, flex: 1 },
  resultTextMain: { color: '#fff', fontSize: 18, fontWeight: '900' },
  resultTextSub: { color: '#d1fae5', fontSize: 13, marginTop: 2, fontWeight: '600' },
  
  resetButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15 },
  resetButtonText: { color: '#ef4444', fontWeight: '800', fontSize: 15 }
});