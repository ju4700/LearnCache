/**
 * LearnCache - Educational Website Offline Downloader
 * Professional minimalist design for optimal learning experience
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, StatusBar } from 'react-native';

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
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
            },
            headerTintColor: '#111827',
            headerTitleStyle: {
              fontWeight: '600',
              fontSize: 18,
              color: '#111827',
            },
            cardStyle: {
              backgroundColor: '#FFFFFF',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="SavedSites"
            component={SavedSitesScreen}
            options={{
              title: 'Downloaded Sites',
            }}
          />
          <Stack.Screen
            name="SiteViewer"
            component={SiteViewerScreen}
            options={({ route }) => ({
              title: route.params?.siteName || 'Site Viewer',
              headerStyle: {
                backgroundColor: '#FFFFFF',
                elevation: 1,
                shadowOpacity: 0.1,
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
              },
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default App;
