import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DownloadProgress } from '../types';
import DownloadService from '../services/DownloadService';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  const validateUrl = (input: string): boolean => {
    try {
      // Clean the input
      const cleanInput = input.trim();
      
      // Add protocol if missing
      const urlToTest = cleanInput.match(/^https?:\/\//) 
        ? cleanInput 
        : `https://${cleanInput}`;
      
      const urlObj = new URL(urlToTest);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  const normalizeUrl = (input: string): string => {
    const cleanInput = input.trim();
    return cleanInput.match(/^https?:\/\//) 
      ? cleanInput 
      : `https://${cleanInput}`;
  };

  const handleDownload = async () => {
    Keyboard.dismiss();
    
    if (!url.trim()) {
      Alert.alert('Invalid URL', 'Please enter a website URL');
      return;
    }

    if (!validateUrl(url)) {
      Alert.alert('Invalid URL', 'Please enter a valid website URL\n\nExample: w3schools.com');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(null);

    try {
      const downloadService = DownloadService.getInstance();
      const normalizedUrl = normalizeUrl(url);
      
      const site = await downloadService.downloadSite(
        normalizedUrl,
        (progress: DownloadProgress) => {
          setDownloadProgress(progress);
        }
      );

      setUrl('');
      Alert.alert(
        'Download Complete',
        `${site.name} is now available offline`,
        [
          { text: 'View Sites', onPress: () => navigation.navigate('SavedSites') },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      Alert.alert('Download Failed', message);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const isValidInput = url.trim().length > 0 && validateUrl(url);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>LearnCache</Text>
          <Text style={styles.subtitle}>Download websites for offline learning</Text>
        </View>

        {/* Main Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Website URL</Text>
          <TextInput
            style={[styles.input, isValidInput && styles.inputValid]}
            placeholder="Enter URL (e.g., w3schools.com)"
            placeholderTextColor="#9CA3AF"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="url"
            keyboardType="url"
            editable={!isDownloading}
            returnKeyType="done"
            onSubmitEditing={handleDownload}
          />
          
          <TouchableOpacity
            style={[
              styles.downloadButton,
              (!isValidInput || isDownloading) && styles.downloadButtonDisabled
            ]}
            onPress={handleDownload}
            disabled={!isValidInput || isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.downloadButtonText}>Download</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Progress Section */}
        {downloadProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Downloading...</Text>
              <Text style={styles.progressPercent}>
                {Math.round(downloadProgress.progress)}%
              </Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${downloadProgress.progress}%` }
                ]} 
              />
            </View>
            
            <Text style={styles.progressFile} numberOfLines={1}>
              {downloadProgress.currentFile}
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => navigation.navigate('TutorialDiscovery')}
          >
            <Text style={styles.primaryActionButtonText}>🔍 Discover Tutorials</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('SavedSites')}
          >
            <Text style={styles.actionButtonText}>View Downloaded Sites</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  inputValid: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  downloadButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  downloadButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressFile: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsSection: {
    marginTop: 'auto',
    gap: 12,
  },
  primaryActionButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});

export default HomeScreen;
