import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedSite, StorageInfo } from '../types';

class StorageService {
  private static instance: StorageService;
  private readonly SITES_DIR = `${RNFS.DocumentDirectoryPath}/offline_sites`;
  private readonly METADATA_KEY = 'saved_sites_metadata';

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create offline sites directory if it doesn't exist
      const dirExists = await RNFS.exists(this.SITES_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.SITES_DIR);
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  async getSavedSites(): Promise<SavedSite[]> {
    try {
      const metadataJson = await AsyncStorage.getItem(this.METADATA_KEY);
      if (!metadataJson) {
        return [];
      }
      
      const sites: SavedSite[] = JSON.parse(metadataJson);
      // Convert date strings back to Date objects
      return sites.map(site => ({
        ...site,
        downloadDate: new Date(site.downloadDate),
      }));
    } catch (error) {
      console.error('Failed to get saved sites:', error);
      return [];
    }
  }

  async saveSiteMetadata(site: SavedSite): Promise<void> {
    try {
      const sites = await this.getSavedSites();
      const existingIndex = sites.findIndex(s => s.id === site.id);
      
      if (existingIndex >= 0) {
        sites[existingIndex] = site;
      } else {
        sites.push(site);
      }
      
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(sites));
    } catch (error) {
      console.error('Failed to save site metadata:', error);
      throw error;
    }
  }

  async deleteSite(siteId: string): Promise<void> {
    try {
      // Remove from metadata
      const sites = await this.getSavedSites();
      const filteredSites = sites.filter(site => site.id !== siteId);
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(filteredSites));
      
      // Remove files
      const sitePath = `${this.SITES_DIR}/${siteId}`;
      const exists = await RNFS.exists(sitePath);
      if (exists) {
        await RNFS.unlink(sitePath);
      }
    } catch (error) {
      console.error('Failed to delete site:', error);
      throw error;
    }
  }

  async getSiteLocalPath(siteId: string): Promise<string> {
    return `${this.SITES_DIR}/${siteId}`;
  }

  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const diskSpaceInfo = await RNFS.getFSInfo();
      
      // Calculate used space by our app
      let usedSize = 0;
      const sites = await this.getSavedSites();
      for (const site of sites) {
        usedSize += site.size;
      }
      
      return {
        totalSize: diskSpaceInfo.totalSpace,
        availableSize: diskSpaceInfo.freeSpace,
        usedSize,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      throw error;
    }
  }

  async calculateDirectorySize(dirPath: string): Promise<number> {
    try {
      const exists = await RNFS.exists(dirPath);
      if (!exists) {
        return 0;
      }
      
      const items = await RNFS.readDir(dirPath);
      let totalSize = 0;
      
      for (const item of items) {
        if (item.isDirectory()) {
          totalSize += await this.calculateDirectorySize(item.path);
        } else {
          totalSize += item.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Failed to calculate directory size:', error);
      return 0;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default StorageService;
