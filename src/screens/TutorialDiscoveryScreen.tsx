import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Tutorial, SiteCrawlResult, TutorialDownloadProgress } from '../types';
import TutorialCrawlerService from '../services/TutorialCrawlerService';
// @ts-ignore - No types available for react-native-vector-icons
import Icon from 'react-native-vector-icons/MaterialIcons';

const TutorialDiscoveryScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<SiteCrawlResult | null>(null);
  const [selectedTutorials, setSelectedTutorials] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<TutorialDownloadProgress | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  const tutorialCrawler = TutorialCrawlerService.getInstance();

  // Set up progress callback
  React.useEffect(() => {
    tutorialCrawler.setProgressCallback((progress) => {
      setDownloadProgress(progress);
      if (progress.status === 'completed' || progress.status === 'failed') {
        setTimeout(() => {
          setShowProgressModal(false);
          setDownloading(false);
          setDownloadProgress(null);
        }, 2000);
      }
    });
  }, [tutorialCrawler]);

  const handleDiscoverTutorials = useCallback(async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setCrawling(true);
    try {
      const result = await tutorialCrawler.crawlSiteForTutorials(url.trim());
      setCrawlResult(result);
      
      if (result.tutorials.length === 0) {
        Alert.alert(
          'No Tutorials Found',
          'No tutorials were discovered on this site. This might be because:\n\n• The site structure is not recognized\n• No tutorial sections were found\n• The site requires authentication\n\nTry a different educational website like W3Schools, TutorialsPoint, or GeeksforGeeks.'
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to discover tutorials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCrawling(false);
    }
  }, [url, tutorialCrawler]);

  const toggleTutorialSelection = useCallback((tutorialId: string) => {
    const newSelection = new Set(selectedTutorials);
    if (newSelection.has(tutorialId)) {
      newSelection.delete(tutorialId);
    } else {
      newSelection.add(tutorialId);
    }
    setSelectedTutorials(newSelection);
  }, [selectedTutorials]);

  const selectAllTutorials = useCallback(() => {
    if (!crawlResult) return;
    setSelectedTutorials(new Set(crawlResult.tutorials.map(t => t.id)));
  }, [crawlResult]);

  const deselectAllTutorials = useCallback(() => {
    setSelectedTutorials(new Set());
  }, []);

  const handleDownloadSelected = useCallback(async () => {
    if (!crawlResult || selectedTutorials.size === 0) {
      Alert.alert('Error', 'Please select at least one tutorial to download');
      return;
    }

    Alert.alert(
      'Download Tutorials',
      `Download ${selectedTutorials.size} selected tutorial(s)? This may take several minutes depending on the size.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setDownloading(true);
            setShowProgressModal(true);
            
            const siteName = crawlResult.siteTitle.replace(/[^a-zA-Z0-9]/g, '_');
            const tutorialsToDownload = crawlResult.tutorials.filter(t => selectedTutorials.has(t.id));
            
            try {
              for (const tutorial of tutorialsToDownload) {
                await tutorialCrawler.downloadTutorial(tutorial, siteName);
              }
              
              Alert.alert(
                'Success!',
                `Successfully downloaded ${tutorialsToDownload.length} tutorial(s). You can now access them offline.`
              );
              
              // Clear selections after successful download
              setSelectedTutorials(new Set());
              
            } catch (error) {
              Alert.alert('Download Failed', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
              setDownloading(false);
              setShowProgressModal(false);
            }
          }
        }
      ]
    );
  }, [crawlResult, selectedTutorials, tutorialCrawler]);

  const renderTutorial = useCallback(({ item }: { item: Tutorial }) => {
    const isSelected = selectedTutorials.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.tutorialCard, isSelected && styles.selectedCard]}
        onPress={() => toggleTutorialSelection(item.id)}
      >
        <View style={styles.tutorialHeader}>
          <Icon
            name={isSelected ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={isSelected ? '#007bff' : '#666'}
          />
          <View style={styles.tutorialInfo}>
            <Text style={styles.tutorialTitle}>{item.title}</Text>
            <Text style={styles.tutorialMeta}>
              📖 {item.totalPages} pages • 🎯 {item.difficulty} • 📂 {item.category}
            </Text>
            <Text style={styles.tutorialSize}>
              ~{Math.round((item.estimatedSize || 0) / 1024)}KB estimated
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [selectedTutorials, toggleTutorialSelection]);

  const getProgressPercentage = (): number => {
    if (!downloadProgress) return 0;
    if (downloadProgress.totalPages === 0) return 0;
    return Math.round((downloadProgress.currentPage / downloadProgress.totalPages) * 100);
  };

  return (
    <View style={styles.container}>
      {/* URL Input Section */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>🔍 Discover Educational Tutorials</Text>
        <TextInput
          style={styles.urlInput}
          placeholder="Enter educational website URL (e.g., https://www.w3schools.com)"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity
          style={[styles.discoverButton, crawling && styles.disabledButton]}
          onPress={handleDiscoverTutorials}
          disabled={crawling}
        >
          {crawling ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Icon name="search" size={20} color="#fff" />
          )}
          <Text style={styles.buttonText}>
            {crawling ? 'Discovering...' : 'Discover Tutorials'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Section */}
      {crawlResult && (
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeader}>
            <Text style={styles.siteTitle}>📚 {crawlResult.siteTitle}</Text>
            <Text style={styles.tutorialCount}>
              Found {crawlResult.totalTutorials} tutorial(s)
            </Text>
          </View>

          {crawlResult.tutorials.length > 0 && (
            <>
              {/* Selection Controls */}
              <View style={styles.selectionControls}>
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={selectAllTutorials}
                >
                  <Text style={styles.selectAllText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deselectAllButton}
                  onPress={deselectAllTutorials}
                >
                  <Text style={styles.deselectAllText}>Clear Selection</Text>
                </TouchableOpacity>
                <Text style={styles.selectedCount}>
                  {selectedTutorials.size} selected
                </Text>
              </View>

              {/* Tutorials List */}
              <FlatList
                data={crawlResult.tutorials}
                renderItem={renderTutorial}
                keyExtractor={(item) => item.id}
                style={styles.tutorialsList}
                showsVerticalScrollIndicator={false}
              />

              {/* Download Button */}
              {selectedTutorials.size > 0 && (
                <TouchableOpacity
                  style={[styles.downloadButton, downloading && styles.disabledButton]}
                  onPress={handleDownloadSelected}
                  disabled={downloading}
                >
                  <Icon name="download" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    Download {selectedTutorials.size} Tutorial(s)
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {/* Progress Modal */}
      <Modal
        visible={showProgressModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.progressModal}>
            <Text style={styles.progressTitle}>Downloading Tutorial</Text>
            
            {downloadProgress && (
              <>
                <Text style={styles.progressText}>
                  {downloadProgress.currentPageTitle}
                </Text>
                
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${getProgressPercentage()}%` }
                    ]}
                  />
                </View>
                
                <Text style={styles.progressStats}>
                  Page {downloadProgress.currentPage} of {downloadProgress.totalPages} 
                  ({getProgressPercentage()}%)
                </Text>
                
                <Text style={styles.progressStatus}>
                  Status: {downloadProgress.status}
                </Text>
                
                {downloadProgress.status === 'downloading' && (
                  <ActivityIndicator
                    size="large"
                    color="#007bff"
                    style={styles.progressSpinner}
                  />
                )}
                
                {downloadProgress.status === 'completed' && (
                  <Icon
                    name="check-circle"
                    size={48}
                    color="#28a745"
                    style={styles.completedIcon}
                  />
                )}
                
                {downloadProgress.status === 'failed' && (
                  <Icon
                    name="error"
                    size={48}
                    color="#dc3545"
                    style={styles.errorIcon}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  inputSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  discoverButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsSection: {
    flex: 1,
    padding: 20,
  },
  resultsHeader: {
    marginBottom: 20,
  },
  siteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tutorialCount: {
    fontSize: 14,
    color: '#666',
  },
  selectionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 15,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 15,
  },
  selectAllText: {
    color: '#007bff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deselectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8d7da',
    borderRadius: 15,
  },
  deselectAllText: {
    color: '#721c24',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  tutorialsList: {
    flex: 1,
    marginBottom: 20,
  },
  tutorialCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedCard: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tutorialMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  tutorialSize: {
    fontSize: 11,
    color: '#999',
  },
  downloadButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModal: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    width: '80%',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  progressStats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  progressStatus: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  progressSpinner: {
    marginTop: 10,
  },
  completedIcon: {
    marginTop: 10,
  },
  errorIcon: {
    marginTop: 10,
  },
});

export default TutorialDiscoveryScreen;
