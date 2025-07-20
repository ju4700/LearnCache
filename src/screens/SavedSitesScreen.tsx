import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SavedSite } from '../types';
import StorageService from '../services/StorageService';
import { formatDate, formatFileSize } from '../utils';

interface Props {
  navigation: any;
}

const SavedSitesScreen: React.FC<Props> = ({ navigation }) => {
  const [sites, setSites] = useState<SavedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSites = useCallback(async () => {
    try {
      const storageService = StorageService.getInstance();
      const savedSites = await storageService.getSavedSites();
      setSites(savedSites.sort((a, b) => b.downloadDate.getTime() - a.downloadDate.getTime()));
    } catch (error) {
      console.error('Failed to load sites:', error);
      Alert.alert('Error', 'Failed to load saved sites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSites();
    });

    return unsubscribe;
  }, [navigation, loadSites]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSites();
  };

  const handleOpenSite = (site: SavedSite) => {
    if (site.status !== 'completed') {
      Alert.alert(
        'Site Not Ready',
        site.status === 'downloading'
          ? 'This site is still being downloaded. Please wait for it to complete.'
          : 'This site failed to download. You can try downloading it again.'
      );
      return;
    }

    navigation.navigate('SiteViewer', {
      siteId: site.id,
      siteName: site.name,
    });
  };

  const handleDeleteSite = (site: SavedSite) => {
    Alert.alert(
      'Delete Site',
      `Are you sure you want to delete "${site.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const storageService = StorageService.getInstance();
              await storageService.deleteSite(site.id);
              setSites(prevSites => prevSites.filter(s => s.id !== site.id));
            } catch (error) {
              console.error('Failed to delete site:', error);
              Alert.alert('Error', 'Failed to delete site');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: SavedSite['status']) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'downloading':
        return '#ffc107';
      case 'failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status: SavedSite['status']) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'downloading':
        return 'Downloading...';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const renderSiteItem = ({ item }: { item: SavedSite }) => (
    <TouchableOpacity
      style={styles.siteItem}
      onPress={() => handleOpenSite(item)}
      onLongPress={() => handleDeleteSite(item)}
    >
      <View style={styles.siteHeader}>
        <Text style={styles.siteName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.siteUrl} numberOfLines={1}>
        {item.originalUrl}
      </Text>
      
      <View style={styles.siteInfo}>
        <Text style={styles.infoText}>
          📅 {formatDate(item.downloadDate)}
        </Text>
        <Text style={styles.infoText}>
          💾 {formatFileSize(item.size)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No Sites Downloaded Yet</Text>
      <Text style={styles.emptyMessage}>
        Start by downloading your first educational website from the home screen!
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.emptyButtonText}>Download a Site</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading saved sites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Saved Sites</Text>
        <Text style={styles.subtitle}>
          {sites.length} {sites.length === 1 ? 'site' : 'sites'} downloaded
        </Text>
      </View>

      <FlatList
        data={sites}
        renderItem={renderSiteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sites.length === 0 ? styles.emptyContainer : styles.listContainer}
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
      
      {sites.length > 0 && (
        <View style={styles.helpText}>
          <Text style={styles.helpMessage}>
            💡 Tap to open, long press to delete
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
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  listContainer: {
    padding: 16,
  },
  siteItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  siteUrl: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  siteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoText: {
    fontSize: 12,
    color: '#6c757d',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
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
    color: '#6c757d',
  },
  helpText: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  helpMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default SavedSitesScreen;
