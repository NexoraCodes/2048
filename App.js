import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AudioProvider } from './src/contexts/AudioContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AudioProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AudioProvider>
  );
}
