/**
 * InventoryStack - Stack navigator for Inventory module
 *
 * Screens: StockList → StockTransfer → CycleCount
 *
 * Requirements: 3.1, 3.4, 3.5
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StockListScreen } from '../../modules/inventory/screens/StockListScreen';
import { StockTransferScreen } from '../../modules/inventory/screens/StockTransferScreen';
import { CycleCountScreen } from '../../modules/inventory/screens/CycleCountScreen';
import type { InventoryStackParamList } from './types';

const Stack = createStackNavigator<InventoryStackParamList>();

export const InventoryStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="StockList"
      screenOptions={{
        headerStyle: { backgroundColor: '#F57C00' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="StockList"
        component={StockListScreen as React.ComponentType}
        options={{ title: 'สต็อกสินค้า' }}
      />
      <Stack.Screen
        name="StockTransfer"
        component={StockTransferScreen as React.ComponentType}
        options={{ title: 'ย้ายสต็อก' }}
      />
      <Stack.Screen
        name="CycleCount"
        component={CycleCountScreen as React.ComponentType}
        options={{ title: 'นับสต็อก' }}
      />
    </Stack.Navigator>
  );
};
