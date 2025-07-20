import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { DownloadProgress } from '../types';
import DownloadService from '../services/DownloadService';
import { isValidUrl } from '../utils';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  const handleDownload = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    if (!isValidUrl(url)) {
      Alert.alert('Error', 'Please enter a valid URL (e.g., https://www.w3schools.com)');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(null);

    try {
      const downloadService = DownloadService.getInstance();
      
      const site = await downloadService.downloadSite(
        url,
        (progress: DownloadProgress) => {
          setDownloadProgress(progress);
        }
      );

      Alert.alert(
        'Success!',
        `${site.name} has been downloaded successfully!`,
        [
          {
            text: 'View Sites',
            onPress: () => navigation.navigate('SavedSites'),
          },
          { text: 'OK' },
        ]
      );

      setUrl('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Download Failed', message);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const navigateToSavedSites = () => {
    navigation.navigate('SavedSites');
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <Text style={styles.title}>📚 LearnCache</Text>
        <Text style={styles.subtitle}>
          Download educational websites for offline learning
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Download Website</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter website URL (e.g., https://www.w3schools.com)"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isDownloading}
        />

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isDownloading && styles.disabledButton]}
          onPress={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Download Website</Text>
          )}
        </TouchableOpacity>

        {downloadProgress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {downloadProgress.currentFile}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${downloadProgress.progress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercent}>
              {Math.round(downloadProgress.progress)}% Complete
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Saved Websites</Text>
        <Text style={styles.description}>
          View and manage your downloaded websites
        </Text>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={navigateToSavedSites}
        >
          <Text style={styles.secondaryButtonText}>View Saved Sites</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 Tips</Text>
        <Text style={styles.infoText}>
          • Works best with educational sites like W3Schools, MDN, GeeksforGeeks{'\n'}
          • Static content downloads faster and works better offline{'\n'}
          • Make sure you have sufficient storage space{'\n'}
          • Some sites may take several minutes to download completely
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007bff',
  },
  disabledButton: {
    backgroundColor: '#adb5bd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#e7f3ff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bee5eb',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0c5460',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#0c5460',
    lineHeight: 20,
  },
});

export default HomeScreen;
