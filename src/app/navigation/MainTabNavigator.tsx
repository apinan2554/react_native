/**
 * MainTabNavigator - Bottom tab navigator with 3 WMS tabs
 *
 * Tabs:
 * - รับสินค้า (Inbound) — 📥
 * - จัดเก็บ (Putaway) — 📦
 * - สต็อก (Inventory) — 📊
 *
 * Requirements: 1.1-3.6
 */

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { InboundStack } from './InboundStack';
import { PutawayStack } from './PutawayStack';
import { InventoryStack } from './InventoryStack';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="InboundTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: '#757575',
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="InboundTab"
        component={InboundStack}
        options={{
          tabBarLabel: 'รับสินค้า',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PutawayTab"
        component={PutawayStack}
        options={{
          tabBarLabel: 'จัดเก็บ',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📦</Text>
          ),
        }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={InventoryStack}
        options={{
          tabBarLabel: 'สต็อก',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📊</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};
