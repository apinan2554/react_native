/**
 * PutawayStack - Stack navigator for Putaway module
 *
 * Screens: BinSuggestion → PutawayConfirm
 *
 * Requirements: 2.1, 2.4, 2.5
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BinSuggestionScreen } from '../../modules/putaway/screens/BinSuggestionScreen';
import { PutawayConfirmScreen } from '../../modules/putaway/screens/PutawayConfirmScreen';
import type { PutawayStackParamList } from './types';

const Stack = createStackNavigator<PutawayStackParamList>();

export const PutawayStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="BinSuggestion"
      screenOptions={{
        headerStyle: { backgroundColor: '#388E3C' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="BinSuggestion"
        component={BinSuggestionScreen as React.ComponentType}
        options={{ title: 'แนะนำตำแหน่งจัดเก็บ' }}
      />
      <Stack.Screen
        name="PutawayConfirm"
        component={PutawayConfirmScreen as React.ComponentType}
        options={{ title: 'ยืนยันจัดเก็บ' }}
      />
    </Stack.Navigator>
  );
};
