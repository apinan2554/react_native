/**
 * InboundStack - Stack navigator for Inbound module
 *
 * Screens: BarcodeScan → ReceivingConfirm → DamageReport → GRNHistory
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BarcodeScanScreen } from '../../modules/inbound/screens/BarcodeScanScreen';
import { ReceivingConfirmScreen } from '../../modules/inbound/screens/ReceivingConfirmScreen';
import { DamageReportScreen } from '../../modules/inbound/screens/DamageReportScreen';
import { GRNHistoryScreen } from '../../modules/inbound/screens/GRNHistoryScreen';
import type { InboundStackParamList } from './types';

const Stack = createStackNavigator<InboundStackParamList>();

export const InboundStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="BarcodeScan"
      screenOptions={{
        headerStyle: { backgroundColor: '#1976D2' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen as React.ComponentType}
        options={{ title: 'สแกนบาร์โค้ด' }}
      />
      <Stack.Screen
        name="ReceivingConfirm"
        component={ReceivingConfirmScreen as React.ComponentType}
        options={{ title: 'ยืนยันรับสินค้า' }}
      />
      <Stack.Screen
        name="DamageReport"
        component={DamageReportScreen as React.ComponentType}
        options={{ title: 'รายงานสินค้าเสียหาย' }}
      />
      <Stack.Screen
        name="GRNHistory"
        component={GRNHistoryScreen as React.ComponentType}
        options={{ title: 'ประวัติ GRN' }}
      />
    </Stack.Navigator>
  );
};
