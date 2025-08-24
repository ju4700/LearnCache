export interface TutorialPage {
  id: string;
  title: string;
  url: string;
  order: number;
  downloaded: boolean;
  size?: number;
}

export interface Tutorial {
  id: string;
  title: string;
  description?: string;
  baseUrl: string;
  pages: TutorialPage[];
  totalPages: number;
  downloadedPages: number;
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedSize?: number;
}

export interface SiteCrawlResult {
  siteTitle: string;
  siteUrl: string;
  tutorials: Tutorial[];
  totalTutorials: number;
  crawlDate: Date;
}

export interface TutorialDownloadProgress {
  tutorialId: string;
  currentPage: number;
  totalPages: number;
  currentPageTitle: string;
  status: 'discovering' | 'downloading' | 'completed' | 'failed';
  bytesDownloaded: number;
  totalEstimatedBytes: number;
}
