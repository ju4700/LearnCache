import React, { useState, useEffect, useRef } from 'react';
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
  const [error, setError] = useState<string>('');
  
  // Use ref for WebView to avoid state update loops
  const webViewRef = useRef<WebView>(null);

  // Set up header title
  useEffect(() => {
    navigation.setOptions({
      title: siteName,
    });
  }, [navigation, siteName]);

  // Load site content once on mount
  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      try {
        const storageService = StorageService.getInstance();
        const sitePath = await storageService.getSiteLocalPath(siteId);
        const indexPath = `${sitePath}/index.html`;

        console.log('Loading site from path:', indexPath);
        
        const exists = await RNFS.exists(indexPath);
        if (!exists) {
          console.error('Index file does not exist:', indexPath);
          if (isMounted) {
            setError('Site files not found');
            setLoading(false);
          }
          return;
        }

        const content = await RNFS.readFile(indexPath, 'utf8');
        console.log('HTML content loaded, length:', content.length);
        console.log('HTML content preview:', content.substring(0, 500));
        
        if (!content || content.trim().length === 0) {
          if (isMounted) {
            setError('Site content is empty');
            setLoading(false);
          }
          return;
        }
        
        // Basic HTML validation and wrapping if needed
        let processedContent = content;
        if (!content.toLowerCase().includes('<html') && !content.toLowerCase().includes('<!doctype')) {
          console.warn('Content does not appear to be valid HTML, wrapping...');
          processedContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline Content</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
        }
        
        if (isMounted) {
          setHtmlContent(processedContent);
          setLoading(false);
        }
      } catch (loadError) {
        console.error('Failed to load site content:', loadError);
        if (isMounted) {
          const errorMessage = loadError instanceof Error ? loadError.message : 'Unknown error';
          setError('Failed to load site content: ' + errorMessage);
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [siteId]); // Only depend on siteId

  // Handle hardware back button for Android
  useEffect(() => {
    const handleBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleWebViewNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    console.error('WebView error details:', {
      url: nativeEvent.url,
      code: nativeEvent.code,
      description: nativeEvent.description,
      domain: nativeEvent.domain,
      canGoBack: nativeEvent.canGoBack,
      canGoForward: nativeEvent.canGoForward,
    });
    setError(`WebView failed to render: ${nativeEvent.description || 'Unknown error'}`);
  };

  const handleWebViewLoad = () => {
    setWebViewLoading(false);
  };

  const handleWebViewLoadStart = () => {
    console.log('WebView load started');
    setWebViewLoading(true);
  };

  const handleGoBack = () => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
    }
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
        ref={webViewRef}
        source={{ 
          html: htmlContent,
          baseUrl: 'file:///' 
        }}
        style={styles.webView}
        onNavigationStateChange={handleWebViewNavigationStateChange}
        onError={handleWebViewError}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
          setError(`HTTP Error: ${nativeEvent.statusCode} - ${nativeEvent.description}`);
        }}
        onLoad={handleWebViewLoad}
        onLoadEnd={handleWebViewLoad}
        onLoadStart={handleWebViewLoadStart}
        onMessage={(event) => {
          console.log('WebView message:', event.nativeEvent.data);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={true}
        allowsBackForwardNavigationGestures={true}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url.toLowerCase();
          console.log('WebView navigation request:', url);
          
          // Allow data URLs and about:blank
          if (url.startsWith('data:') || url === 'about:blank') {
            return true;
          }
          
          // Handle file URLs - check if they're trying to navigate to relative paths
          if (url.startsWith('file://')) {
            // If it's a simple file path like file:///python-tutorial, it's likely a broken relative link
            if (url.match(/^file:\/\/\/[^/]+$/) && !url.includes('.html')) {
              Alert.alert(
                'Page Not Available',
                'This tutorial page was not downloaded or is not available offline. Try downloading the complete site or check if this specific page exists.',
                [{ text: 'OK' }]
              );
              return false;
            }
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
          
          // For any other navigation attempts, show a helpful message
          Alert.alert(
            'Navigation Not Available',
            'This content is not available offline. Only the main page content can be viewed.',
            [{ text: 'OK' }]
          );
          return false;
        }}
      />

      {canGoBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
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
