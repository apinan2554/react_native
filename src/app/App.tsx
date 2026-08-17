/**
 * App - Root component for WMS application
 *
 * Wraps NavigationContainer with MainTabNavigator.
 * Entry point for WMS navigation structure.
 *
 * Requirements: 1.1-3.6
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainTabNavigator } from './navigation';

export const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
