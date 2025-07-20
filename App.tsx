/**
 * LearnCache - Educational Website Offline Downloader
 * Download and browse educational websites completely offline
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import SavedSitesScreen from './src/screens/SavedSitesScreen';
import SiteViewerScreen from './src/screens/SiteViewerScreen';
import StorageService from './src/services/StorageService';
import { NavigationStackParamList } from './src/types';

const Stack = createStackNavigator<NavigationStackParamList>();

function App() {
  useEffect(() => {
    // Initialize storage service when app starts
    const initializeApp = async () => {
      try {
        const storageService = StorageService.getInstance();
        await storageService.initialize();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize the app. Some features may not work properly.'
        );
      }
    };

    initializeApp();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
            elevation: 2,
            shadowOpacity: 0.1,
          },
          headerTintColor: '#2c3e50',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'LearnCache',
            headerStyle: {
              backgroundColor: '#f8f9fa',
              elevation: 0,
              shadowOpacity: 0,
            },
          }}
        />
        <Stack.Screen
          name="SavedSites"
          component={SavedSitesScreen}
          options={{
            title: 'Saved Sites',
          }}
        />
        <Stack.Screen
          name="SiteViewer"
          component={SiteViewerScreen}
          options={({ route }) => ({
            title: route.params?.siteName || 'Site Viewer',
            headerStyle: {
              backgroundColor: '#fff',
            },
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
