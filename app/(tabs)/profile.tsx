import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// ✅ Import ส่วนที่ใช้จัดการ Database
import { db } from '../../services/db';
import { useShoppingStore } from '../../store/useShoppingStore';

export default function ProfileScreen() {
  const [name, setName] = useState('Shopping Master');
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);

  const router = useRouter();
  const fetchData = useShoppingStore((state) => state.fetchData); // ฟังก์ชันสำหรับสั่งให้แอปโหลดข้อมูลใหม่

  const handleSaveName = () => {
    setName(tempName);
    setIsEditing(false);
  };

  // ✅ ฟังก์ชันสำหรับล้างข้อมูลใน Database
  const handleClearAllData = async () => {
    try {
      // ลบข้อมูลโดยเรียงลำดับจาก ตารางลูก ไป ตารางแม่ เพื่อไม่ให้ติด Foreign Key Constraint
      await db.runAsync('DELETE FROM items');
      await db.runAsync('DELETE FROM aisles');
      await db.runAsync('DELETE FROM stores');
      
      // สั่งให้ Store โหลดข้อมูลใหม่ (เพื่อให้หน้า Home กลายเป็นว่างเปล่า)
      await fetchData();
      
      Alert.alert("สำเร็จ", "ข้อมูลทั้งหมดถูกลบออกจากเครื่องเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Clear data error:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถล้างข้อมูลได้");
    }
  };

  // ✅ ฟังก์ชันยืนยันก่อนลบ
  const confirmClearData = () => {
    Alert.alert(
      "ยืนยันการลบ?", 
      "ข้อมูลร้านค้า โซน และรายการสินค้าทั้งหมดจะหายไปและไม่สามารถกู้คืนได้", 
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
          text: "ลบทั้งหมด", 
          style: "destructive", 
          onPress: handleClearAllData 
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <TouchableOpacity 
            onPress={() => Alert.alert("เลือกรูปภาพ", "ฟีเจอร์เลือกรูปจาก Gallery จะถูกเพิ่มเร็วๆ นี้")}
            style={styles.avatarWrapper}
          >
            <Image 
              source={{ uri: `https://ui-avatars.com/api/?name=${name}&background=10b981&color=fff` }} 
              style={styles.avatar} 
            />
            <View style={styles.cameraIcon}>
              <FontAwesome5 name="camera" size={10} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.textInfo}>
            {isEditing ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={styles.nameInput}
                  value={tempName}
                  onChangeText={setTempName}
                  autoFocus
                />
                <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                  <FontAwesome5 name="check" size={14} color="#10b981" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setTempName(name); setIsEditing(true); }} style={styles.nameRow}>
                <Text style={styles.userName}>{name}</Text>
                <FontAwesome5 name="pen" size={12} color="#9ca3af" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
            <View style={styles.statusRow}>
              <View style={styles.dot} />
              <Text style={styles.offlineStatus}>ข้อมูลถูกเก็บไว้ในเครื่องเท่านั้น</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Shopping Settings */}
      <Text style={styles.sectionTitle}>การตั้งค่าการช้อปปิ้ง</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/manage-stores')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
            <FontAwesome5 name="store" size={18} color="#0284c7" />
          </View>
          <Text style={styles.menuTitle}>แก้ไขรายชื่อร้านค้า</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/manage-aisles')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
            <FontAwesome5 name="layer-group" size={18} color="#10b981" />
          </View>
          <Text style={styles.menuTitle}>จัดการหมวดหมู่/โซน</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity 
  style={styles.menuItem}
  onPress={() => router.push('/manage-items')} // ✅ แก้จาก Alert เป็น router.push
>
  <View style={[styles.iconBox, { backgroundColor: '#fff1f2' }]}>
    <FontAwesome5 name="box-open" size={18} color="#e11d48" />
  </View>
  <Text style={styles.menuTitle}>จัดการฐานข้อมูลสินค้า</Text>
  <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
</TouchableOpacity>
      </View>

      {/* General Settings */}
      <Text style={styles.sectionTitle}>ทั่วไป</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.iconBox, { backgroundColor: '#f5f3ff' }]}>
            <FontAwesome5 name="bell" size={18} color="#7c3aed" />
          </View>
          <Text style={styles.menuTitle}>การแจ้งเตือน</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
            <FontAwesome5 name="file-export" size={18} color="#ea580c" />
          </View>
          <Text style={styles.menuTitle}>ส่งออกข้อมูล (CSV/Excel)</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.clearDataButton} 
          onPress={confirmClearData}
        >
          <Text style={styles.clearDataText}>ลบข้อมูลแอปทั้งหมด</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>แอปนี้เป็นแบบ Offline ข้อมูลจะหายไปเมื่อถอนการติดตั้ง</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E7EB' },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10b981',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInfo: { marginLeft: 20, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  editNameRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  nameInput: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', paddingVertical: 4, flex: 1 },
  saveBtn: { padding: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  offlineStatus: { fontSize: 12, color: '#6b7280' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#9ca3af', marginLeft: 24, marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
  footer: { marginTop: 40, paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
  clearDataButton: { paddingVertical: 12 },
  clearDataText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  versionText: { color: '#9ca3af', fontSize: 11, marginTop: 8, textAlign: 'center' },
});