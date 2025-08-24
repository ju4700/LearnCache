import StaticServer from 'react-native-static-server';
import RNFS from 'react-native-fs';

class OfflineServerService {
  private static instance: OfflineServerService;
  private server: StaticServer | null = null;
  private serverUrl: string | null = null;

  static getInstance(): OfflineServerService {
    if (!OfflineServerService.instance) {
      OfflineServerService.instance = new OfflineServerService();
    }
    return OfflineServerService.instance;
  }

  /**
   * Start local HTTP server for complex offline sites
   * This is useful for sites with absolute paths or complex routing
   */
  async startServer(sitePath: string, port: number = 8080): Promise<string> {
    try {
      // Stop existing server if running
      if (this.server) {
        await this.stopServer();
      }

      // Verify the site path exists
      const exists = await RNFS.exists(sitePath);
      if (!exists) {
        throw new Error('Site path does not exist');
      }

      // Create and configure the static server
      this.server = new StaticServer(port, sitePath, {
        localOnly: true,
        keepAlive: false,
      });

      // Start the server
      const url = await this.server.start();
      this.serverUrl = url;
      
      console.log(`Local server started at: ${url}`);
      return url;
      
    } catch (error) {
      console.error('Failed to start local server:', error);
      throw error;
    }
  }

  /**
   * Stop the local HTTP server
   */
  async stopServer(): Promise<void> {
    try {
      if (this.server) {
        await this.server.stop();
        this.server = null;
        this.serverUrl = null;
        console.log('Local server stopped');
      }
    } catch (error) {
      console.error('Failed to stop local server:', error);
    }
  }

  /**
   * Get the current server URL
   */
  getServerUrl(): string | null {
    return this.serverUrl;
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.server !== null && this.serverUrl !== null;
  }

  /**
   * Get URL for accessing a specific file through the local server
   */
  getFileUrl(relativePath: string): string | null {
    if (!this.serverUrl) {
      return null;
    }
    return `${this.serverUrl}/${relativePath.replace(/^\//, '')}`;
  }

  /**
   * Start server for a tutorial and return the index URL
   */
  async startTutorialServer(tutorialPath: string): Promise<string> {
    const port = this.generateRandomPort();
    const serverUrl = await this.startServer(tutorialPath, port);
    
    // Check for tutorial index file
    const indexFiles = ['index.html', 'tutorial_index.html'];
    
    for (const indexFile of indexFiles) {
      const indexPath = `${tutorialPath}/${indexFile}`;
      const exists = await RNFS.exists(indexPath);
      if (exists) {
        return `${serverUrl}/${indexFile}`;
      }
    }
    
    // Return the server root if no index file found
    return serverUrl;
  }

  /**
   * Generate a random port number for the server
   */
  private generateRandomPort(): number {
    return Math.floor(Math.random() * (9999 - 8080 + 1)) + 8080;
  }

  /**
   * Clean up when app is closing
   */
  async cleanup(): Promise<void> {
    await this.stopServer();
  }
}

export default OfflineServerService;
