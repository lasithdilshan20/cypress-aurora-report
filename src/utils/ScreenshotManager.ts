import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { ScreenshotConfig } from '../types';
import { Logger } from './Logger';

export class ScreenshotManager {
  private config: ScreenshotConfig;
  private logger: Logger;

  constructor(config: ScreenshotConfig = {}) {
    this.config = {
      enabled: true,
      quality: 90,
      format: 'png',
      onFailureOnly: true,
      compressImages: true,
      viewport: { width: 1280, height: 720 },
      ...config
    };
    this.logger = new Logger('ScreenshotManager');
  }

  /**
   * Take a screenshot with custom options
   */
  async takeScreenshot(options: {
    name?: string;
    path?: string;
    element?: string;
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  }): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotName = options.name || `screenshot-${timestamp}`;
      const screenshotPath = options.path || path.join(process.cwd(), 'aurora-reports', 'screenshots', `${screenshotName}.${this.config.format}`);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(screenshotPath));

      // Take screenshot using Cypress command
      // This would be called from within a Cypress test
      const screenshotResult = await this.captureScreenshot(screenshotPath, options);

      // Compress if enabled
      if (this.config.compressImages) {
        await this.compressScreenshot(screenshotPath);
      }

      this.logger.debug(`Screenshot saved: ${screenshotPath}`);
      return screenshotPath;

    } catch (error) {
      this.logger.error('Error taking screenshot:', error);
      throw error;
    }
  }

  /**
   * Compress screenshot using Sharp
   */
  async compressScreenshot(screenshotPath: string): Promise<void> {
    try {
      const exists = await fs.pathExists(screenshotPath);
      if (!exists) {
        this.logger.warn(`Screenshot not found for compression: ${screenshotPath}`);
        return;
      }

      const tempPath = `${screenshotPath}.tmp`;
      
      if (this.config.format === 'png') {
        await sharp(screenshotPath)
          .png({ 
            quality: this.config.quality,
            compressionLevel: 9,
            adaptiveFiltering: true,
            progressive: true
          })
          .toFile(tempPath);
      } else {
        await sharp(screenshotPath)
          .jpeg({ 
            quality: this.config.quality,
            progressive: true,
            mozjpeg: true
          })
          .toFile(tempPath);
      }

      // Replace original with compressed version
      await fs.move(tempPath, screenshotPath, { overwrite: true });
      
      this.logger.debug(`Screenshot compressed: ${screenshotPath}`);

    } catch (error) {
      this.logger.error('Error compressing screenshot:', error);
      // Clean up temp file if it exists
      try {
        await fs.remove(`${screenshotPath}.tmp`);
      } catch {}
      throw error;
    }
  }

  /**
   * Generate thumbnail from screenshot
   */
  async generateThumbnail(screenshotPath: string, thumbnailSize: { width: number; height: number } = { width: 200, height: 150 }): Promise<string> {
    try {
      const exists = await fs.pathExists(screenshotPath);
      if (!exists) {
        throw new Error(`Screenshot not found: ${screenshotPath}`);
      }

      const ext = path.extname(screenshotPath);
      const baseName = path.basename(screenshotPath, ext);
      const thumbnailPath = path.join(path.dirname(screenshotPath), 'thumbnails', `${baseName}_thumb${ext}`);

      // Ensure thumbnail directory exists
      await fs.ensureDir(path.dirname(thumbnailPath));

      // Generate thumbnail
      await sharp(screenshotPath)
        .resize(thumbnailSize.width, thumbnailSize.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      this.logger.debug(`Thumbnail generated: ${thumbnailPath}`);
      return thumbnailPath;

    } catch (error) {
      this.logger.error('Error generating thumbnail:', error);
      throw error;
    }
  }

  /**
   * Get screenshot metadata
   */
  async getScreenshotMetadata(screenshotPath: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    density: number;
  }> {
    try {
      const exists = await fs.pathExists(screenshotPath);
      if (!exists) {
        throw new Error(`Screenshot not found: ${screenshotPath}`);
      }

      const metadata = await sharp(screenshotPath).metadata();
      const stats = await fs.stat(screenshotPath);

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: stats.size,
        density: metadata.density || 72
      };

    } catch (error) {
      this.logger.error('Error getting screenshot metadata:', error);
      throw error;
    }
  }

  /**
   * Cleanup old screenshots
   */
  async cleanupOldScreenshots(directory: string, maxAge: number): Promise<number> {
    try {
      const exists = await fs.pathExists(directory);
      if (!exists) {
        return 0;
      }

      const cutoffDate = new Date(Date.now() - maxAge);
      const files = await fs.readdir(directory);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && stats.mtime < cutoffDate) {
          await fs.remove(filePath);
          deletedCount++;
        }
      }

      this.logger.debug(`Cleaned up ${deletedCount} old screenshots from ${directory}`);
      return deletedCount;

    } catch (error) {
      this.logger.error('Error cleaning up old screenshots:', error);
      throw error;
    }
  }

  /**
   * Batch process screenshots
   */
  async batchProcessScreenshots(screenshotPaths: string[], operations: {
    compress?: boolean;
    generateThumbnails?: boolean;
    resize?: { width: number; height: number };
  }): Promise<string[]> {
    const processedPaths: string[] = [];

    try {
      for (const screenshotPath of screenshotPaths) {
        let currentPath = screenshotPath;

        if (operations.compress) {
          await this.compressScreenshot(currentPath);
        }

        if (operations.resize) {
          const resizedPath = await this.resizeScreenshot(currentPath, operations.resize);
          currentPath = resizedPath;
        }

        if (operations.generateThumbnails) {
          await this.generateThumbnail(currentPath);
        }

        processedPaths.push(currentPath);
      }

      this.logger.debug(`Batch processed ${processedPaths.length} screenshots`);
      return processedPaths;

    } catch (error) {
      this.logger.error('Error batch processing screenshots:', error);
      throw error;
    }
  }

  /**
   * Resize screenshot
   */
  private async resizeScreenshot(screenshotPath: string, size: { width: number; height: number }): Promise<string> {
    try {
      const ext = path.extname(screenshotPath);
      const baseName = path.basename(screenshotPath, ext);
      const resizedPath = path.join(path.dirname(screenshotPath), `${baseName}_resized${ext}`);

      await sharp(screenshotPath)
        .resize(size.width, size.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(resizedPath);

      return resizedPath;

    } catch (error) {
      this.logger.error('Error resizing screenshot:', error);
      throw error;
    }
  }

  /**
   * Capture screenshot (placeholder for Cypress integration)
   */
  private async captureScreenshot(screenshotPath: string, options: any): Promise<any> {
    // This would be implemented differently in the actual Cypress environment
    // For now, it's a placeholder that would interface with Cypress screenshot API
    throw new Error('captureScreenshot should be implemented in Cypress environment');
  }

  /**
   * Validate screenshot format
   */
  validateFormat(format: string): boolean {
    return ['png', 'jpeg', 'jpg'].includes(format.toLowerCase());
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): string[] {
    return ['png', 'jpeg', 'jpg'];
  }
}