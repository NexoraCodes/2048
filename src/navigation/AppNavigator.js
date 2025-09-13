import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Game2048Screen from '../screens/2048';
import HomeScreen from '../screens/HomeScreen';
import SplashScreen from '../screens/SplashScreen';
import { StatusBar } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <>
    <StatusBar hidden />
    <Stack.Navigator 
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#faf8ef',
        },
        headerTintColor: '#776e65',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen} 
        options={{ 
          title: 'Splash',
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: 'Home',
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="Game2048" 
        component={Game2048Screen} 
        options={{ 
          title: '2048 Game',
          headerShown: false
        }}
      />
    </Stack.Navigator>
    </>
  );
}
