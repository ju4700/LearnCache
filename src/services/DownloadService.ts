import RNFS from 'react-native-fs';
import { SavedSite, DownloadProgress } from '../types';
import StorageService from './StorageService';

class DownloadService {
  private static instance: DownloadService;
  private downloadInProgress = false;
  private currentDownloadId: string | null = null;
  private progressCallback: ((progress: DownloadProgress) => void) | null = null;

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  async downloadSite(
    url: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<SavedSite> {
    if (this.downloadInProgress) {
      throw new Error('Another download is already in progress');
    }

    this.downloadInProgress = true;
    this.progressCallback = onProgress || null;

    try {
      // Generate site ID and validate URL
      const siteId = this.generateSiteId(url);
      this.currentDownloadId = siteId;
      
      const validatedUrl = this.validateAndNormalizeUrl(url);
      const siteName = this.extractSiteName(validatedUrl);
      
      // Create site directory
      const storageService = StorageService.getInstance();
      const sitePath = await storageService.getSiteLocalPath(siteId);
      await RNFS.mkdir(sitePath);

      // Create initial site metadata
      const site: SavedSite = {
        id: siteId,
        name: siteName,
        originalUrl: validatedUrl,
        downloadDate: new Date(),
        localPath: sitePath,
        size: 0,
        status: 'downloading',
      };

      await storageService.saveSiteMetadata(site);

      // Start download process
      await this.performDownload(validatedUrl, sitePath, siteId);

      // Calculate final size and update metadata
      const finalSize = await storageService.calculateDirectorySize(sitePath);
      const completedSite: SavedSite = {
        ...site,
        size: finalSize,
        status: 'completed',
      };

      await storageService.saveSiteMetadata(completedSite);
      return completedSite;

    } catch (error) {
      console.error('Download failed:', error);
      
      // Update status to failed if we have a site record
      if (this.currentDownloadId) {
        try {
          const storageService = StorageService.getInstance();
          const sites = await storageService.getSavedSites();
          const failedSite = sites.find(s => s.id === this.currentDownloadId);
          if (failedSite) {
            failedSite.status = 'failed';
            await storageService.saveSiteMetadata(failedSite);
          }
        } catch (metaError) {
          console.error('Failed to update site status:', metaError);
        }
      }
      
      throw error;
    } finally {
      this.downloadInProgress = false;
      this.currentDownloadId = null;
      this.progressCallback = null;
    }
  }

  private async performDownload(url: string, sitePath: string, siteId: string): Promise<void> {
    try {
      // This is a simplified version. In a real implementation, you would:
      // 1. Use a more sophisticated crawler
      // 2. Handle different content types
      // 3. Convert absolute URLs to relative
      // 4. Download all assets (CSS, JS, images, etc.)
      
      this.reportProgress(siteId, 'Starting download...', 0, 1, 0);

      // Download the main page
      const mainPageResponse = await this.fetchWithTimeout(url);
      const htmlContent = await mainPageResponse.text();
      
      this.reportProgress(siteId, 'Processing main page...', 1, 3, 33);

      // Save main page as index.html
      const indexPath = `${sitePath}/index.html`;
      const processedHtml = this.processHtmlForOffline(htmlContent, url);
      await RNFS.writeFile(indexPath, processedHtml, 'utf8');

      this.reportProgress(siteId, 'Downloading assets...', 2, 3, 66);

      // Extract and download assets (simplified)
      await this.downloadAssets(processedHtml, url, sitePath, siteId);

      this.reportProgress(siteId, 'Download completed!', 3, 3, 100);

    } catch (error) {
      console.error('Download process failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to download site: ${message}`);
    }
  }

  private async downloadAssets(htmlContent: string, baseUrl: string, sitePath: string, siteId: string): Promise<void> {
    // Create assets directory
    const assetsPath = `${sitePath}/assets`;
    await RNFS.mkdir(assetsPath);

    // Extract URLs from HTML (simplified regex approach)
    const urlPatterns = [
      /href=["']([^"']+\.css)[^"']*["']/gi,
      /src=["']([^"']+\.js)[^"']*["']/gi,
      /src=["']([^"']+\.(png|jpg|jpeg|gif|svg|ico))[^"']*["']/gi,
    ];

    const assetUrls = new Set<string>();
    
    for (const pattern of urlPatterns) {
      let match;
      while ((match = pattern.exec(htmlContent)) !== null) {
        const assetUrl = this.resolveUrl(match[1], baseUrl);
        if (assetUrl && this.isValidAssetUrl(assetUrl)) {
          assetUrls.add(assetUrl);
        }
      }
    }

    // Download each asset
    let completed = 0;
    const total = assetUrls.size;

    for (const assetUrl of assetUrls) {
      try {
        const fileName = this.extractFileName(assetUrl);
        const assetPath = `${assetsPath}/${fileName}`;
        
        const response = await this.fetchWithTimeout(assetUrl);
        const blob = await response.blob();
        
        // Convert blob to base64 for React Native file system
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        await RNFS.writeFile(assetPath, base64Data, 'base64');
        
        completed++;
        this.reportProgress(siteId, `Downloaded ${fileName}`, completed, total, 66 + (completed / total) * 34);
        
      } catch (error) {
        console.warn(`Failed to download asset ${assetUrl}:`, error);
        // Continue with other assets even if one fails
      }
    }
  }

  private processHtmlForOffline(html: string, _baseUrl: string): string {
    // Convert absolute URLs to relative paths for offline viewing
    // This is a simplified version - a real implementation would be more comprehensive
    
    let processedHtml = html;
    
    // Replace CSS links
    processedHtml = processedHtml.replace(
      /href=["']([^"']+\.css)[^"']*["']/gi,
      (match, url) => {
        const fileName = this.extractFileName(url);
        return `href="./assets/${fileName}"`;
      }
    );

    // Replace JavaScript sources
    processedHtml = processedHtml.replace(
      /src=["']([^"']+\.js)[^"']*["']/gi,
      (match, url) => {
        const fileName = this.extractFileName(url);
        return `src="./assets/${fileName}"`;
      }
    );

    // Replace image sources
    processedHtml = processedHtml.replace(
      /src=["']([^"']+\.(png|jpg|jpeg|gif|svg|ico))[^"']*["']/gi,
      (match, url) => {
        const fileName = this.extractFileName(url);
        return `src="./assets/${fileName}"`;
      }
    );

    return processedHtml;
  }

  private generateSiteId(url: string): string {
    const timestamp = Date.now();
    const hash = url.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `${hash}_${timestamp}`;
  }

  private validateAndNormalizeUrl(url: string): string {
    // Add https:// if no protocol is specified
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Basic URL validation
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  private extractSiteName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      return 'Unknown Site';
    }
  }

  private resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch (error) {
      return '';
    }
  }

  private isValidAssetUrl(url: string): boolean {
    // Check if URL is from the same domain or a reasonable asset
    const assetExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
    return assetExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  private extractFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || 'asset';
      
      // Ensure file has an extension
      if (!fileName.includes('.')) {
        return `${fileName}.asset`;
      }
      
      return fileName;
    } catch (error) {
      return `asset_${Date.now()}`;
    }
  }

  private async fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LearnCache/1.0 (Educational Content Downloader)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private reportProgress(siteId: string, currentFile: string, completed: number, total: number, progress: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        siteId,
        currentFile,
        totalFiles: total,
        completedFiles: completed,
        progress: Math.min(progress, 100),
      });
    }
  }

  isDownloadInProgress(): boolean {
    return this.downloadInProgress;
  }

  getCurrentDownloadId(): string | null {
    return this.currentDownloadId;
  }
}

export default DownloadService;
