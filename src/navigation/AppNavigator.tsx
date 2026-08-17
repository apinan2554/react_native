import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardScreen from '../screens/DashboardScreen';
import ProductScreen from '../screens/ProductScreen';
import ZoneScreen from '../screens/ZoneScreen';
import InboundScreen from '../screens/InboundScreen';
import TransferScreen from '../screens/TransferScreen';
import OutboundScreen from '../screens/OutboundScreen';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: '#90A4AE',
        headerStyle: { backgroundColor: '#455A64', elevation: 0 },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        tabBarStyle: { paddingBottom: 6, paddingTop: 4, height: 64, backgroundColor: '#fff', elevation: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'ภาพรวม',
          tabBarIcon: ({ color, size }) => <Icon name="view-dashboard" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductScreen}
        options={{
          title: 'สินค้า',
          tabBarIcon: ({ color, size }) => <Icon name="package-variant" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Zones"
        component={ZoneScreen}
        options={{
          title: 'โซน',
          tabBarIcon: ({ color, size }) => <Icon name="warehouse" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Inbound"
        component={InboundScreen}
        options={{
          title: 'รับเข้า',
          tabBarIcon: ({ color, size }) => <Icon name="package-down" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Transfer"
        component={TransferScreen}
        options={{
          title: 'โอนย้าย',
          tabBarIcon: ({ color, size }) => <Icon name="swap-horizontal" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Outbound"
        component={OutboundScreen}
        options={{
          title: 'เบิกจ่าย',
          tabBarIcon: ({ color, size }) => <Icon name="package-up" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
