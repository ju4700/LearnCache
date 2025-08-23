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
        'Site Unavailable',
        site.status === 'downloading'
          ? 'This site is still downloading'
          : 'This site failed to download'
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
      `Delete "${site.name}"?`,
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

  const getStatusIndicator = (status: SavedSite['status']) => {
    switch (status) {
      case 'completed':
        return { color: '#10B981', text: '●' };
      case 'downloading':
        return { color: '#F59E0B', text: '●' };
      case 'failed':
        return { color: '#EF4444', text: '●' };
      default:
        return { color: '#6B7280', text: '●' };
    }
  };

  const renderSiteItem = ({ item }: { item: SavedSite }) => {
    const statusIndicator = getStatusIndicator(item.status);
    
    return (
      <TouchableOpacity
        style={styles.siteItem}
        onPress={() => handleOpenSite(item)}
        onLongPress={() => handleDeleteSite(item)}
        activeOpacity={0.7}
      >
        <View style={styles.siteHeader}>
          <View style={styles.siteNameContainer}>
            <Text style={[styles.statusIndicator, { color: statusIndicator.color }]}>
              {statusIndicator.text}
            </Text>
            <Text style={styles.siteName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
        
        <Text style={styles.siteUrl} numberOfLines={1}>
          {item.originalUrl}
        </Text>
        
        <View style={styles.siteInfo}>
          <Text style={styles.infoText}>
            {formatDate(item.downloadDate)}
          </Text>
          <Text style={styles.infoText}>
            {formatFileSize(item.size)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Downloads Yet</Text>
      <Text style={styles.emptyMessage}>
        Start downloading educational websites from the home screen
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
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sites.length > 0 && (
        <View style={styles.header}>
          <Text style={styles.sitesCount}>
            {sites.length} {sites.length === 1 ? 'site' : 'sites'}
          </Text>
        </View>
      )}

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
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      {sites.length > 0 && (
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sitesCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  siteItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    fontSize: 12,
    marginRight: 8,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  siteUrl: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  siteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  helpText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default SavedSitesScreen;
