import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Tutorial } from '../types';
import RNFS from 'react-native-fs';
import StorageService from '../services/StorageService';

interface Props {
  navigation: any;
}

interface DownloadedTutorial extends Tutorial {
  downloadPath: string;
  downloadDate: Date;
  size: number;
}

const MyTutorialsScreen: React.FC<Props> = ({ navigation }) => {
  const [tutorials, setTutorials] = useState<DownloadedTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const calculateDirectorySize = useCallback(async (dirPath: string): Promise<number> => {
    try {
      const items = await RNFS.readDir(dirPath);
      let totalSize = 0;
      
      for (const item of items) {
        if (item.isDirectory()) {
          totalSize += await calculateDirectorySize(item.path);
        } else {
          totalSize += item.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Failed to calculate directory size:', error);
      return 0;
    }
  }, []);

  const loadTutorials = useCallback(async () => {
    try {
      const storageService = StorageService.getInstance();
      const sitesDir = await storageService.getSiteLocalPath('');
      const sitesDirParent = sitesDir.replace('/offline_sites/', '/offline_sites');
      
      // Check if sites directory exists
      const exists = await RNFS.exists(sitesDirParent);
      if (!exists) {
        setTutorials([]);
        return;
      }

      const items = await RNFS.readDir(sitesDirParent);
      const tutorialList: DownloadedTutorial[] = [];

      for (const item of items) {
        if (item.isDirectory()) {
          const metadataPath = `${item.path}/tutorial_metadata.json`;
          const metadataExists = await RNFS.exists(metadataPath);
          
          if (metadataExists) {
            try {
              const metadataContent = await RNFS.readFile(metadataPath, 'utf8');
              const tutorial = JSON.parse(metadataContent) as Tutorial;
              
              // Calculate directory size
              const size = await calculateDirectorySize(item.path);
              
              tutorialList.push({
                ...tutorial,
                downloadPath: item.path,
                downloadDate: new Date(item.mtime || Date.now()),
                size
              });
            } catch (error) {
              console.warn('Failed to load tutorial metadata:', error);
            }
          }
        }
      }

      // Sort by download date (newest first)
      tutorialList.sort((a, b) => b.downloadDate.getTime() - a.downloadDate.getTime());
      setTutorials(tutorialList);
      
    } catch (error) {
      console.error('Failed to load tutorials:', error);
      Alert.alert('Error', 'Failed to load tutorials');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateDirectorySize]);

  useEffect(() => {
    loadTutorials();
  }, [loadTutorials]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTutorials();
    });
    return unsubscribe;
  }, [navigation, loadTutorials]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTutorials();
  };

  const handleOpenTutorial = (tutorial: DownloadedTutorial) => {
    navigation.navigate('TutorialViewer', {
      tutorialPath: tutorial.downloadPath,
      tutorialTitle: tutorial.title,
    });
  };

  const handleDeleteTutorial = (tutorial: DownloadedTutorial) => {
    Alert.alert(
      'Delete Tutorial',
      `Delete "${tutorial.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await RNFS.unlink(tutorial.downloadPath);
              setTutorials(prevTutorials => 
                prevTutorials.filter(t => t.id !== tutorial.id)
              );
            } catch (error) {
              console.error('Failed to delete tutorial:', error);
              Alert.alert('Error', 'Failed to delete tutorial');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'Beginner': return '#28a745';
      case 'Advanced': return '#dc3545';
      default: return '#ffc107';
    }
  };

  const renderTutorialItem = ({ item }: { item: DownloadedTutorial }) => {
    return (
      <TouchableOpacity
        style={styles.tutorialItem}
        onPress={() => handleOpenTutorial(item)}
        onLongPress={() => handleDeleteTutorial(item)}
        activeOpacity={0.7}
      >
        <View style={styles.tutorialHeader}>
          <View style={styles.tutorialTitleContainer}>
            <Text style={styles.tutorialIcon}>📚</Text>
            <Text style={styles.tutorialTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <Text 
            style={[
              styles.difficultyBadge, 
              { 
                backgroundColor: getDifficultyColor(item.difficulty || 'Intermediate') + '20', 
                color: getDifficultyColor(item.difficulty || 'Intermediate')
              }
            ]}
          >
            {item.difficulty || 'Intermediate'}
          </Text>
        </View>
        
        <Text style={styles.tutorialCategory}>
          📂 {item.category}
        </Text>
        
        <View style={styles.tutorialStats}>
          <Text style={styles.statItem}>
            📖 {item.downloadedPages || item.totalPages} pages
          </Text>
          <Text style={styles.statItem}>
            💾 {formatFileSize(item.size)}
          </Text>
          <Text style={styles.statItem}>
            📅 {formatDate(item.downloadDate)}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.round(((item.downloadedPages || 0) / item.totalPages) * 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(((item.downloadedPages || 0) / item.totalPages) * 100)}% complete
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No Tutorials Downloaded</Text>
      <Text style={styles.emptyMessage}>
        Discover and download educational tutorials to access them offline!
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('TutorialDiscovery')}
      >
        <Text style={styles.emptyButtonText}>🔍 Discover Tutorials</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading tutorials...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tutorialsCount}>
          {tutorials.length} tutorial{tutorials.length !== 1 ? 's' : ''} downloaded
        </Text>
      </View>

      <FlatList
        data={tutorials}
        renderItem={renderTutorialItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tutorials.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      {tutorials.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.helpText}>
            Tap to open • Long press to delete
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tutorialsCount: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  tutorialItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tutorialTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  tutorialIcon: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  difficultyBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tutorialCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  tutorialStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    fontSize: 12,
    color: '#999',
    flex: 1,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#666',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default MyTutorialsScreen;
