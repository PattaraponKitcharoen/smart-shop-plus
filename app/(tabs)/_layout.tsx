import { FontAwesome5 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10b981', // Emerald Green
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
        },
        headerStyle: {
          backgroundColor: '#10b981',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'ช้อปปิ้ง',
          tabBarIcon: ({ color }) => <FontAwesome5 name="shopping-basket" size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: 'เพิ่มของ',
          tabBarIcon: ({ color }) => <FontAwesome5 name="plus-circle" size={22} color={color} />,
        }}
      />

      {/* ปุ่มตะกร้าตรงกลาง - ดีไซน์พิเศษ */}
      <Tabs.Screen
        name="cart"
        options={{
          title: 'ตะกร้า',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 60,
              height: 60,
              backgroundColor: focused ? '#059669' : '#10b981',
              borderRadius: 30,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: Platform.OS === 'ios' ? 25 : 35, // ลอยขึ้นมา
              elevation: 5, // เงาสำหรับ Android
              shadowColor: '#000', // เงาสำหรับ iOS
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
            }}>
              <FontAwesome5 name="shopping-cart" size={24} color="white" />
            </View>
          ),
          tabBarLabel: () => null, // ปิดชื่อใต้ไอคอนเฉพาะปุ่มกลางเพื่อให้ดูเด่น
        }}
      />

      <Tabs.Screen
        name="calc"
        options={{
          title: 'เทียบราคา',
          tabBarIcon: ({ color }) => <FontAwesome5 name="calculator" size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}