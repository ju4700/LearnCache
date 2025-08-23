import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  BackHandler,
  TouchableOpacity,
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
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const showSiteInfo = () => {
      Alert.alert(
        'Site Info',
        `Viewing: ${siteName}\nStored offline for learning`,
        [{ text: 'OK' }]
      );
    };

    navigation.setOptions({
      title: siteName,
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={showSiteInfo}
        >
          <Text style={styles.headerButtonText}>ⓘ</Text>
        </TouchableOpacity>
      ),
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
          setError('Site files not found');
          return;
        }

        const content = await RNFS.readFile(indexPath, 'utf8');
        setHtmlContent(content);
      } catch (loadError) {
        console.error('Failed to load site content:', loadError);
        setError('Failed to load site content');
      } finally {
        setLoading(false);
      }
    };

    loadSiteContent();
  }, [siteId]);

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
    setError('Failed to load content');
  };

  const handleWebViewLoad = () => {
    setWebViewLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading {siteName}...</Text>
      </View>
    );
  }

  if (error || !htmlContent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Content Unavailable</Text>
        <Text style={styles.errorMessage}>
          {error || 'The website content could not be loaded'}
        </Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {webViewLoading && (
        <View style={styles.webViewLoadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.webViewLoadingText}>Rendering...</Text>
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
          const url = request.url.toLowerCase();
          
          // Allow data URLs and about:blank
          if (url.startsWith('data:') || url === 'about:blank') {
            return true;
          }
          
          // Block external HTTP/HTTPS URLs
          if (url.startsWith('http://') || url.startsWith('https://')) {
            Alert.alert(
              'External Link',
              'This link requires internet access and is not available offline',
              [{ text: 'OK' }]
            );
            return false;
          }
          
          return true;
        }}
      />

      {canGoBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => webViewRef?.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  webViewLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F3F4F6',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webViewLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    marginRight: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  backButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SiteViewerScreen;
