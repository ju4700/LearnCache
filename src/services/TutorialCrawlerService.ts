import { Tutorial, TutorialPage, SiteCrawlResult, TutorialDownloadProgress } from '../types';
import RNFS from 'react-native-fs';
import StorageService from './StorageService';
import { parse } from 'node-html-parser';
import RNBlobUtil from 'react-native-blob-util';

class TutorialCrawlerService {
  private static instance: TutorialCrawlerService;
  private progressCallback?: (progress: TutorialDownloadProgress) => void;

  static getInstance(): TutorialCrawlerService {
    if (!TutorialCrawlerService.instance) {
      TutorialCrawlerService.instance = new TutorialCrawlerService();
    }
    return TutorialCrawlerService.instance;
  }

  setProgressCallback(callback: (progress: TutorialDownloadProgress) => void) {
    this.progressCallback = callback;
  }

  /**
   * Crawl a website to discover all available tutorials
   */
  async crawlSiteForTutorials(url: string): Promise<SiteCrawlResult> {
    try {
      console.log('Starting site crawl for:', url);
      
      // Fetch the main page
      const response = await fetch(url);
      const html = await response.text();
      
      // Extract site title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const siteTitle = titleMatch ? titleMatch[1].trim() : 'Educational Site';
      
      // Discover tutorials based on site structure
      const tutorials = await this.discoverTutorials(html, url);
      
      return {
        siteTitle,
        siteUrl: url,
        tutorials,
        totalTutorials: tutorials.length,
        crawlDate: new Date()
      };
      
    } catch (error) {
      console.error('Failed to crawl site:', error);
      throw new Error(`Failed to discover tutorials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download a complete tutorial with all its pages
   */
  async downloadTutorial(tutorial: Tutorial, siteName: string): Promise<void> {
    try {
      const storageService = StorageService.getInstance();
      const tutorialPath = await storageService.getSiteLocalPath(`${siteName}_${tutorial.id}`);
      
      // Create tutorial directory
      await RNFS.mkdir(tutorialPath);
      
      this.reportProgress(tutorial.id, 0, tutorial.totalPages, 'Starting download...', 'downloading', 0, 0);
      
      let downloadedBytes = 0;
      const downloadedPages: TutorialPage[] = [];
      
      // Download each page in the tutorial
      for (let i = 0; i < tutorial.pages.length; i++) {
        const page = tutorial.pages[i];
        
        this.reportProgress(
          tutorial.id, 
          i, 
          tutorial.totalPages, 
          page.title, 
          'downloading', 
          downloadedBytes, 
          tutorial.estimatedSize || 0
        );
        
        try {
          // Download the page
          const pageResponse = await fetch(page.url);
          const pageHtml = await pageResponse.text();
          
          // Process HTML for offline viewing
          const processedHtml = this.processPageForOffline(pageHtml, page.url, tutorial.baseUrl);
          
          // Save the page
          const pagePath = `${tutorialPath}/page_${page.order}_${this.sanitizeFileName(page.title)}.html`;
          await RNFS.writeFile(pagePath, processedHtml, 'utf8');
          
          // Download assets for this page
          await this.downloadPageAssets(pageHtml, page.url, tutorialPath);
          
          const pageSize = new TextEncoder().encode(processedHtml).length;
          downloadedBytes += pageSize;
          
          downloadedPages.push({
            ...page,
            downloaded: true,
            size: pageSize
          });
          
        } catch (pageError) {
          console.warn(`Failed to download page ${page.title}:`, pageError);
          downloadedPages.push({
            ...page,
            downloaded: false
          });
        }
      }
      
      // Create tutorial index page
      await this.createTutorialIndex(tutorial, downloadedPages, tutorialPath);
      
      // Save tutorial metadata
      const completedTutorial = {
        ...tutorial,
        pages: downloadedPages,
        downloadedPages: downloadedPages.filter(p => p.downloaded).length
      };
      
      await this.saveTutorialMetadata(completedTutorial, tutorialPath);
      
      this.reportProgress(
        tutorial.id, 
        tutorial.totalPages, 
        tutorial.totalPages, 
        'Download completed!', 
        'completed', 
        downloadedBytes, 
        downloadedBytes
      );
      
    } catch (error) {
      console.error('Tutorial download failed:', error);
      this.reportProgress(tutorial.id, 0, 0, 'Download failed', 'failed', 0, 0);
      throw error;
    }
  }

  private async discoverTutorials(html: string, baseUrl: string): Promise<Tutorial[]> {
    const tutorials: Tutorial[] = [];
    
    // Common patterns for educational sites
    const tutorialPatterns = [
      // TutorialsPoint pattern
      {
        titleSelector: /href=["']([^"']*tutorial[^"']*)["'][^>]*>([^<]+)</gi,
        descriptionPattern: /<p[^>]*>([^<]+)</gi,
        category: 'Programming'
      },
      // W3Schools pattern  
      {
        titleSelector: /href=["']([^"']*\/[^"']*tutorial[^"']*)["'][^>]*>([^<]+)</gi,
        descriptionPattern: /<span[^>]*class[^>]*description[^>]*>([^<]+)</gi,
        category: 'Web Development'
      },
      // GeeksforGeeks pattern
      {
        titleSelector: /href=["']([^"']*\/[^"']*tutorial[^"']*)["'][^>]*>([^<]+)</gi,
        descriptionPattern: /<div[^>]*class[^>]*description[^>]*>([^<]+)</gi,
        category: 'Computer Science'
      }
    ];
    
    for (const pattern of tutorialPatterns) {
      let match;
      while ((match = pattern.titleSelector.exec(html)) !== null) {
        const [, relativeUrl, title] = match;
        
        if (this.isValidTutorialLink(title, relativeUrl)) {
          const tutorialUrl = this.resolveUrl(relativeUrl, baseUrl);
          const tutorialId = this.generateTutorialId(title, tutorialUrl);
          
          // Skip if we already found this tutorial
          if (tutorials.find(t => t.id === tutorialId)) {
            continue;
          }
          
          // Discover pages in this tutorial
          const pages = await this.discoverTutorialPages(tutorialUrl, title);
          
          tutorials.push({
            id: tutorialId,
            title: title.trim(),
            baseUrl: tutorialUrl,
            pages,
            totalPages: pages.length,
            downloadedPages: 0,
            category: pattern.category,
            difficulty: this.guessDifficulty(title),
            estimatedSize: pages.length * 50000 // Rough estimate: 50KB per page
          });
        }
      }
    }
    
    return tutorials.slice(0, 20); // Limit to first 20 tutorials found
  }

  private async discoverTutorialPages(tutorialUrl: string, tutorialTitle: string): Promise<TutorialPage[]> {
    try {
      const response = await fetch(tutorialUrl);
      const html = await response.text();
      
      const pages: TutorialPage[] = [];
      
      // Add the main tutorial page
      pages.push({
        id: `${this.generateTutorialId(tutorialTitle, tutorialUrl)}_main`,
        title: `${tutorialTitle} - Introduction`,
        url: tutorialUrl,
        order: 0,
        downloaded: false
      });
      
      // Look for navigation patterns (chapter links, next/prev buttons, etc.)
      const pagePatterns = [
        // Next/chapter links
        /href=["']([^"']+)["'][^>]*>(Chapter|Lesson|Part|Section)\s*(\d+)[^<]*</gi,
        // Navigation menu links
        /href=["']([^"']+)["'][^>]*class[^>]*nav[^>]*>([^<]+)</gi,
        // Table of contents links
        /href=["']([^"']+)["'][^>]*>(\d+[.)]*\s*[^<]+)</gi
      ];
      
      for (const pattern of pagePatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null && pages.length < 50) {
          const [, relativeUrl, , pageTitle] = match;
          const pageUrl = this.resolveUrl(relativeUrl, tutorialUrl);
          
          if (this.isValidPageLink(pageUrl, tutorialUrl)) {
            pages.push({
              id: `${this.generateTutorialId(tutorialTitle, tutorialUrl)}_${pages.length}`,
              title: pageTitle.trim(),
              url: pageUrl,
              order: pages.length,
              downloaded: false
            });
          }
        }
      }
      
      return pages;
      
    } catch (error) {
      console.warn(`Failed to discover pages for ${tutorialTitle}:`, error);
      // Return at least the main page
      return [{
        id: `${this.generateTutorialId(tutorialTitle, tutorialUrl)}_main`,
        title: `${tutorialTitle} - Introduction`,
        url: tutorialUrl,
        order: 0,
        downloaded: false
      }];
    }
  }

  private processPageForOffline(html: string, pageUrl: string, baseUrl: string): string {
    try {
      // Parse HTML with node-html-parser for better performance
      const document = parse(html);
      
      // Process all resource links (images, CSS, JS)
      const resourceElements = document.querySelectorAll('img, link[rel="stylesheet"], script[src]');
      resourceElements.forEach(element => {
        const srcAttr = element.getAttribute('src') || element.getAttribute('href');
        if (srcAttr && this.isAssetUrl(srcAttr)) {
          const fileName = this.extractFileName(srcAttr);
          const newPath = `./assets/${fileName}`;
          
          if (element.getAttribute('src')) {
            element.setAttribute('src', newPath);
          } else if (element.getAttribute('href')) {
            element.setAttribute('href', newPath);
          }
        }
      });
      
      // Add offline navigation to body
      const body = document.querySelector('body');
      if (body) {
        const tutorialNav = this.createOfflineNavigation(pageUrl, baseUrl);
        body.insertAdjacentHTML('afterbegin', tutorialNav);
      }
      
      return document.toString();
      
    } catch (error) {
      console.warn('Failed to parse HTML with node-html-parser, falling back to regex:', error);
      return this.processPageForOfflineFallback(html, pageUrl, baseUrl);
    }
  }

  private processPageForOfflineFallback(html: string, pageUrl: string, baseUrl: string): string {
    let processedHtml = html;
    
    // Replace relative asset URLs with local paths
    processedHtml = processedHtml.replace(
      /(?:src|href)=["']([^"']+\.(css|js|png|jpg|jpeg|gif|svg|ico))[^"']*["']/gi,
      (match, url) => {
        const fileName = this.extractFileName(url);
        return match.replace(url, `./assets/${fileName}`);
      }
    );
    
    // Add offline navigation
    const tutorialNav = this.createOfflineNavigation(pageUrl, baseUrl);
    processedHtml = processedHtml.replace(/<body[^>]*>/i, (match) => {
      return match + tutorialNav;
    });
    
    return processedHtml;
  }

  private createOfflineNavigation(currentPageUrl: string, _baseUrl: string): string {
    return `
      <div style="background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; font-family: Arial, sans-serif;">
        <h4 style="margin: 0 0 10px 0; color: #333;">📚 Tutorial Navigation</h4>
        <button onclick="window.history.back()" style="margin-right: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px;">← Back</button>
        <button onclick="alert('Tutorial Index: All downloaded pages are available in this tutorial folder')" style="padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px;">📖 Tutorial Index</button>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Viewing offline: ${currentPageUrl}</p>
      </div>
    `;
  }

  private async createTutorialIndex(tutorial: Tutorial, pages: TutorialPage[], tutorialPath: string): Promise<void> {
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tutorial.title} - Tutorial Index</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .page-list { list-style: none; padding: 0; }
        .page-item { margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007bff; }
        .page-link { text-decoration: none; color: #007bff; font-weight: bold; }
        .page-link:hover { text-decoration: underline; }
        .downloaded { border-left-color: #28a745; }
        .failed { border-left-color: #dc3545; }
        .stats { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 ${tutorial.title}</h1>
        <div class="stats">
            <strong>Tutorial Statistics:</strong><br>
            📖 Total Pages: ${tutorial.totalPages}<br>
            ✅ Downloaded: ${pages.filter(p => p.downloaded).length}<br>
            ❌ Failed: ${pages.filter(p => !p.downloaded).length}<br>
            📱 Offline Access: Available
        </div>
        
        <h2>📋 Tutorial Contents</h2>
        <ul class="page-list">
            ${pages.map(page => `
                <li class="page-item ${page.downloaded ? 'downloaded' : 'failed'}">
                    ${page.downloaded 
                        ? `<a href="./page_${page.order}_${this.sanitizeFileName(page.title)}.html" class="page-link">${page.title}</a>`
                        : `<span style="color: #dc3545;">${page.title} (Failed to download)</span>`
                    }
                </li>
            `).join('')}
        </ul>
        
        <div style="margin-top: 30px; padding: 15px; background: #d1ecf1; border-radius: 5px;">
            <strong>💡 Tip:</strong> All pages are downloaded for offline viewing. Click on any page title to start reading!
        </div>
    </div>
</body>
</html>`;
    
    await RNFS.writeFile(`${tutorialPath}/index.html`, indexHtml, 'utf8');
  }

  // Helper methods
  private isValidTutorialLink(title: string, url: string): boolean {
    const titleLower = title.toLowerCase();
    const urlLower = url.toLowerCase();
    
    return (
      (titleLower.includes('tutorial') || titleLower.includes('guide') || titleLower.includes('course')) &&
      !titleLower.includes('advertisement') &&
      !titleLower.includes('sponsor') &&
      !urlLower.includes('ads') &&
      !urlLower.includes('promo')
    );
  }

  private isValidPageLink(pageUrl: string, baseUrl: string): boolean {
    try {
      const pageUrlObj = new URL(pageUrl);
      const baseUrlObj = new URL(baseUrl);
      
      // Must be same domain
      if (pageUrlObj.hostname !== baseUrlObj.hostname) {
        return false;
      }
      
      // Must be related to the tutorial path
      return pageUrlObj.pathname.includes(baseUrlObj.pathname.split('/')[1] || '');
    } catch {
      return false;
    }
  }

  private guessDifficulty(title: string): 'Beginner' | 'Intermediate' | 'Advanced' {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('beginner') || titleLower.includes('basic') || titleLower.includes('intro')) {
      return 'Beginner';
    }
    if (titleLower.includes('advanced') || titleLower.includes('expert') || titleLower.includes('master')) {
      return 'Advanced';
    }
    return 'Intermediate';
  }

  private generateTutorialId(title: string, url: string): string {
    const titleHash = title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const urlHash = btoa(url).slice(0, 8);
    return `${titleHash}_${urlHash}`;
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 50);
  }

  private extractFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1] || 'file';
    } catch {
      return url.split('/').pop() || 'file';
    }
  }

  private isAssetUrl(url: string): boolean {
    const assetExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
    const urlLower = url.toLowerCase();
    return assetExtensions.some(ext => urlLower.includes(ext));
  }

  private resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return relativeUrl;
    }
  }

  private async downloadPageAssets(html: string, pageUrl: string, tutorialPath: string): Promise<void> {
    // Create assets directory
    const assetsPath = `${tutorialPath}/assets`;
    const dirExists = await RNFS.exists(assetsPath);
    if (!dirExists) {
      await RNFS.mkdir(assetsPath);
    }

    // Parse HTML to find assets using node-html-parser
    try {
      const document = parse(html);
      const assetElements = document.querySelectorAll('img[src], link[href*=".css"], script[src*=".js"]');
      
      for (const element of assetElements) {
        try {
          const assetUrl = element.getAttribute('src') || element.getAttribute('href');
          if (!assetUrl || !this.isAssetUrl(assetUrl)) continue;
          
          const fullAssetUrl = this.resolveUrl(assetUrl, pageUrl);
          const fileName = this.extractFileName(assetUrl);
          const assetPath = `${assetsPath}/${fileName}`;

          // Skip if already exists
          if (await RNFS.exists(assetPath)) {
            continue;
          }

          // Use react-native-blob-util for better binary file handling
          const response = await RNBlobUtil.fetch('GET', fullAssetUrl);
          
          if (response.info().status === 200) {
            // Save directly to file system
            await RNFS.writeFile(assetPath, response.base64(), 'base64');
          }
          
        } catch (error) {
          console.warn('Failed to download asset:', error);
        }
      }
      
    } catch (parseError) {
      console.warn('Failed to parse HTML for assets, falling back to regex:', parseError);
      
      // Fallback to regex-based asset extraction
      const assetPatterns = [
        /(?:src|href)=["']([^"']+\.(css|js|png|jpg|jpeg|gif|svg|ico))[^"']*["']/gi
      ];

      for (const pattern of assetPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          try {
            const assetUrl = this.resolveUrl(match[1], pageUrl);
            const fileName = this.extractFileName(assetUrl);
            const assetPath = `${assetsPath}/${fileName}`;

            // Skip if already exists
            if (await RNFS.exists(assetPath)) {
              continue;
            }

            const response = await RNBlobUtil.fetch('GET', assetUrl);
            if (response.info().status === 200) {
              await RNFS.writeFile(assetPath, response.base64(), 'base64');
            }
            
          } catch (error) {
            console.warn('Failed to download asset:', error);
          }
        }
      }
    }
  }

  private async saveTutorialMetadata(tutorial: Tutorial, tutorialPath: string): Promise<void> {
    const metadataPath = `${tutorialPath}/tutorial_metadata.json`;
    await RNFS.writeFile(metadataPath, JSON.stringify(tutorial, null, 2), 'utf8');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private reportProgress(
    tutorialId: string,
    currentPage: number,
    totalPages: number,
    currentPageTitle: string,
    status: TutorialDownloadProgress['status'],
    bytesDownloaded: number,
    totalEstimatedBytes: number
  ) {
    if (this.progressCallback) {
      this.progressCallback({
        tutorialId,
        currentPage,
        totalPages,
        currentPageTitle,
        status,
        bytesDownloaded,
        totalEstimatedBytes
      });
    }
  }
}

export default TutorialCrawlerService;
