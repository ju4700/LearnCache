import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  StatusBar,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import RNFS from 'react-native-fs';
import StorageService from '../services/StorageService';

interface Props {
  navigation: any;
  route: {
    params: {
      siteId: string;
      siteName: string;
    };
  };
}

const SiteViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { siteId, siteName } = route.params;
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewRef, setWebViewRef] = useState<WebView | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: siteName,
      headerTitleStyle: {
        fontSize: 16,
      },
    });
  }, [navigation, siteName]);

  useEffect(() => {
    const loadSiteContent = async () => {
      try {
        const storageService = StorageService.getInstance();
        const sitePath = await storageService.getSiteLocalPath(siteId);
        const indexPath = `${sitePath}/index.html`;

        const exists = await RNFS.exists(indexPath);
        if (!exists) {
          Alert.alert(
            'File Not Found',
            'The downloaded site files could not be found. The site may have been corrupted or deleted.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        const content = await RNFS.readFile(indexPath, 'utf8');
        setHtmlContent(content);
      } catch (error) {
        console.error('Failed to load site content:', error);
        Alert.alert(
          'Error',
          'Failed to load the website. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };

    loadSiteContent();
  }, [siteId, navigation]);

  // Handle hardware back button for Android
  useEffect(() => {
    const handleBackPress = () => {
      if (canGoBack && webViewRef) {
        webViewRef.goBack();
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => backHandler.remove();
  }, [canGoBack, webViewRef]);

  const handleWebViewNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    
    Alert.alert(
      'Loading Error',
      'Failed to load the website content. Some features may not work properly in offline mode.',
      [{ text: 'OK' }]
    );
  };

  const handleWebViewLoad = () => {
    setWebViewLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading {siteName}...</Text>
      </View>
    );
  }

  if (!htmlContent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Content Not Available</Text>
        <Text style={styles.errorMessage}>
          The website content could not be loaded. Please check if the site was downloaded correctly.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {webViewLoading && (
        <View style={styles.webViewLoadingContainer}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.webViewLoadingText}>Rendering content...</Text>
        </View>
      )}

      <WebView
        ref={(ref) => setWebViewRef(ref)}
        source={{ html: htmlContent }}
        style={styles.webView}
        onNavigationStateChange={handleWebViewNavigationStateChange}
        onError={handleWebViewError}
        onLoad={handleWebViewLoad}
        onLoadEnd={handleWebViewLoad}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={true}
        allowsBackForwardNavigationGestures={true}
        // Disable external links
        onShouldStartLoadWithRequest={(request) => {
          // Only allow navigation within the same origin or relative URLs
          const url = request.url.toLowerCase();
          
          // Allow data URLs (for inline resources)
          if (url.startsWith('data:')) {
            return true;
          }
          
          // Allow about:blank
          if (url === 'about:blank') {
            return true;
          }
          
          // Block external HTTP/HTTPS URLs
          if (url.startsWith('http://') || url.startsWith('https://')) {
            Alert.alert(
              'External Link',
              'This link leads to an external website that is not available offline.',
              [{ text: 'OK' }]
            );
            return false;
          }
          
          // Allow relative URLs and other protocols
          return true;
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  webViewLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  webViewLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default SiteViewerScreen;
