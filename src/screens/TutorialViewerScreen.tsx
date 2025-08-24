import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import RNFS from 'react-native-fs';

interface Props {
  navigation: any;
  route: {
    params: {
      tutorialPath: string;
      tutorialTitle: string;
    };
  };
}

const TutorialViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tutorialPath } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [indexHtmlContent, setIndexHtmlContent] = useState<string | null>(null);
  
  const webViewRef = useRef<WebView>(null);

  // Load tutorial index content
  useEffect(() => {
    const loadTutorialContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if tutorial path exists
        const pathExists = await RNFS.exists(tutorialPath);
        if (!pathExists) {
          throw new Error('Tutorial not found');
        }

        // Try to load index.html first
        const indexPath = `${tutorialPath}/index.html`;
        const indexExists = await RNFS.exists(indexPath);
        
        if (indexExists) {
          const indexContent = await RNFS.readFile(indexPath, 'utf8');
          setIndexHtmlContent(indexContent);
        } else {
          // If no index, look for tutorial metadata and create a simple index
          const metadataPath = `${tutorialPath}/tutorial_metadata.json`;
          const metadataExists = await RNFS.exists(metadataPath);
          
          if (metadataExists) {
            const metadataContent = await RNFS.readFile(metadataPath, 'utf8');
            const tutorial = JSON.parse(metadataContent);
            const simpleIndex = await createSimpleIndex(tutorial, tutorialPath);
            setIndexHtmlContent(simpleIndex);
          } else {
            throw new Error('No tutorial content found');
          }
        }

      } catch (loadError) {
        console.error('Failed to load tutorial:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load tutorial');
      } finally {
        setLoading(false);
      }
    };

    loadTutorialContent();
  }, [tutorialPath]);

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

  const createSimpleIndex = async (tutorial: any, tutorialDir: string): Promise<string> => {
    // List all HTML files in the tutorial directory
    const files = await RNFS.readDir(tutorialDir);
    const htmlFiles = files.filter(file => file.name.endsWith('.html') && file.name !== 'index.html');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tutorial.title} - Tutorial</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .page-list { list-style: none; padding: 0; }
        .page-item { margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007bff; }
        .page-link { text-decoration: none; color: #007bff; font-weight: bold; }
        .page-link:hover { text-decoration: underline; }
        .stats { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 ${tutorial.title}</h1>
        <div class="stats">
            <strong>Tutorial Information:</strong><br>
            📖 Total Files: ${htmlFiles.length}<br>
            🎯 Difficulty: ${tutorial.difficulty || 'Unknown'}<br>
            📂 Category: ${tutorial.category || 'Educational'}<br>
            📱 Status: Available Offline
        </div>
        
        <h2>📋 Tutorial Files</h2>
        <ul class="page-list">
            ${htmlFiles.map(file => `
                <li class="page-item">
                    <a href="./${file.name}" class="page-link">${file.name.replace(/^page_\d+_/, '').replace('.html', '').replace(/_/g, ' ')}</a>
                </li>
            `).join('')}
        </ul>
        
        <div style="margin-top: 30px; padding: 15px; background: #d1ecf1; border-radius: 5px;">
            <strong>💡 Tip:</strong> Click on any file to start reading the tutorial content!
        </div>
    </div>
</body>
</html>`;
  };

  const handleWebViewNavigationStateChange = useCallback((navState: any) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const handleWebViewError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError('Failed to load tutorial content');
  }, []);

  const handleWebViewLoad = useCallback(() => {
    setWebViewLoading(false);
  }, []);

  const handleGoBack = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      navigation.goBack();
    }
  }, [canGoBack, navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading tutorial...</Text>
      </View>
    );
  }

  if (error || !indexHtmlContent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Failed to Load Tutorial</Text>
        <Text style={styles.errorMessage}>
          {error || 'Tutorial content is not available'}
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
      <WebView
        ref={webViewRef}
        source={{ 
          html: indexHtmlContent,
          baseUrl: `file://${tutorialPath}/`
        }}
        style={styles.webView}
        onNavigationStateChange={handleWebViewNavigationStateChange}
        onError={handleWebViewError}
        onLoad={handleWebViewLoad}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webViewLoadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}
      />
      
      {webViewLoading && (
        <View style={styles.webViewLoadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.webViewLoadingText}>Loading content...</Text>
        </View>
      )}

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
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
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
  webViewLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  webViewLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  webViewLoadingText: {
    marginTop: 16,
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

export default TutorialViewerScreen;
