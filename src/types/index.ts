// Type definitions for LearnCache app

export interface SavedSite {
  id: string;
  name: string;
  originalUrl: string;
  downloadDate: Date;
  localPath: string;
  size: number; // in bytes
  status: 'downloading' | 'completed' | 'failed';
}

export interface DownloadProgress {
  siteId: string;
  currentFile: string;
  totalFiles: number;
  completedFiles: number;
  progress: number; // 0-100
}

export interface StorageInfo {
  totalSize: number;
  availableSize: number;
  usedSize: number;
}

export type NavigationStackParamList = {
  Home: undefined;
  SavedSites: undefined;
  SiteViewer: {
    siteId: string;
    siteName: string;
  };
};

export interface AppConfig {
  maxSiteSize: number; // maximum size per site in bytes
  downloadTimeout: number; // timeout in milliseconds
  userAgent: string;
}
