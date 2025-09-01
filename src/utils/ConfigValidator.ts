import { AuroraReporterConfig, Theme, ExportFormat } from '../types';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigValidator {
  
  validate(config: AuroraReporterConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic types
    if (typeof config.enabled !== 'undefined' && typeof config.enabled !== 'boolean') {
      errors.push('enabled must be a boolean');
    }

    if (typeof config.outputDir !== 'undefined' && typeof config.outputDir !== 'string') {
      errors.push('outputDir must be a string');
    }

    if (typeof config.screenshotDir !== 'undefined' && typeof config.screenshotDir !== 'string') {
      errors.push('screenshotDir must be a string');
    }

    if (typeof config.dashboardPort !== 'undefined') {
      if (typeof config.dashboardPort !== 'number' || 
          config.dashboardPort < 1000 || 
          config.dashboardPort > 65535) {
        errors.push('dashboardPort must be a number between 1000 and 65535');
      }
    }

    if (typeof config.retentionDays !== 'undefined') {
      if (typeof config.retentionDays !== 'number' || config.retentionDays < 0) {
        errors.push('retentionDays must be a non-negative number');
      }
    }

    if (typeof config.realTimeUpdates !== 'undefined' && typeof config.realTimeUpdates !== 'boolean') {
      errors.push('realTimeUpdates must be a boolean');
    }

    // Validate theme
    if (config.theme && !Object.values(Theme).includes(config.theme)) {
      errors.push(`theme must be one of: ${Object.values(Theme).join(', ')}`);
    }

    // Validate screenshot config
    if (config.screenshots) {
      const screenshotErrors = this.validateScreenshotConfig(config.screenshots);
      errors.push(...screenshotErrors);
    }

    // Validate database config
    if (config.database) {
      const databaseErrors = this.validateDatabaseConfig(config.database);
      errors.push(...databaseErrors);
    }

    // Validate export config
    if (config.exports) {
      const exportErrors = this.validateExportConfig(config.exports);
      errors.push(...exportErrors);
    }

    // Validate notification config
    if (config.notifications) {
      const notificationErrors = this.validateNotificationConfig(config.notifications);
      errors.push(...notificationErrors);
    }

    // Add warnings
    if (config.retentionDays && config.retentionDays > 365) {
      warnings.push('retentionDays is set to more than 1 year, this may consume significant disk space');
    }

    if (config.screenshots?.quality && config.screenshots.quality < 50) {
      warnings.push('Screenshot quality is set below 50, images may be poor quality');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateScreenshotConfig(config: any): string[] {
    const errors: string[] = [];

    if (typeof config.enabled !== 'undefined' && typeof config.enabled !== 'boolean') {
      errors.push('screenshots.enabled must be a boolean');
    }

    if (typeof config.quality !== 'undefined') {
      if (typeof config.quality !== 'number' || config.quality < 1 || config.quality > 100) {
        errors.push('screenshots.quality must be a number between 1 and 100');
      }
    }

    if (config.format && !['png', 'jpeg', 'jpg'].includes(config.format)) {
      errors.push('screenshots.format must be one of: png, jpeg, jpg');
    }

    if (typeof config.onFailureOnly !== 'undefined' && typeof config.onFailureOnly !== 'boolean') {
      errors.push('screenshots.onFailureOnly must be a boolean');
    }

    if (typeof config.compressImages !== 'undefined' && typeof config.compressImages !== 'boolean') {
      errors.push('screenshots.compressImages must be a boolean');
    }

    if (config.viewport) {
      if (typeof config.viewport.width !== 'number' || config.viewport.width < 1) {
        errors.push('screenshots.viewport.width must be a positive number');
      }
      if (typeof config.viewport.height !== 'number' || config.viewport.height < 1) {
        errors.push('screenshots.viewport.height must be a positive number');
      }
    }

    return errors;
  }

  private validateDatabaseConfig(config: any): string[] {
    const errors: string[] = [];

    if (typeof config.path !== 'undefined' && typeof config.path !== 'string') {
      errors.push('database.path must be a string');
    }

    if (typeof config.maxConnections !== 'undefined') {
      if (typeof config.maxConnections !== 'number' || config.maxConnections < 1) {
        errors.push('database.maxConnections must be a positive number');
      }
    }

    if (typeof config.enableWAL !== 'undefined' && typeof config.enableWAL !== 'boolean') {
      errors.push('database.enableWAL must be a boolean');
    }

    if (typeof config.backupInterval !== 'undefined') {
      if (typeof config.backupInterval !== 'number' || config.backupInterval < 0) {
        errors.push('database.backupInterval must be a non-negative number');
      }
    }

    return errors;
  }

  private validateExportConfig(config: any): string[] {
    const errors: string[] = [];

    if (config.allowedFormats) {
      if (!Array.isArray(config.allowedFormats)) {
        errors.push('exports.allowedFormats must be an array');
      } else {
        const validFormats = Object.values(ExportFormat);
        const invalidFormats = config.allowedFormats.filter((format: any) => 
          !validFormats.includes(format)
        );
        if (invalidFormats.length > 0) {
          errors.push(`exports.allowedFormats contains invalid formats: ${invalidFormats.join(', ')}`);
        }
      }
    }

    if (config.defaultFormat && !Object.values(ExportFormat).includes(config.defaultFormat)) {
      errors.push(`exports.defaultFormat must be one of: ${Object.values(ExportFormat).join(', ')}`);
    }

    if (typeof config.includeScreenshots !== 'undefined' && typeof config.includeScreenshots !== 'boolean') {
      errors.push('exports.includeScreenshots must be a boolean');
    }

    if (config.pdfOptions) {
      const pdfErrors = this.validatePDFOptions(config.pdfOptions);
      errors.push(...pdfErrors);
    }

    return errors;
  }

  private validatePDFOptions(config: any): string[] {
    const errors: string[] = [];

    if (config.pageSize && !['A4', 'A3', 'Letter'].includes(config.pageSize)) {
      errors.push('exports.pdfOptions.pageSize must be one of: A4, A3, Letter');
    }

    if (config.orientation && !['portrait', 'landscape'].includes(config.orientation)) {
      errors.push('exports.pdfOptions.orientation must be one of: portrait, landscape');
    }

    if (typeof config.includeCharts !== 'undefined' && typeof config.includeCharts !== 'boolean') {
      errors.push('exports.pdfOptions.includeCharts must be a boolean');
    }

    if (typeof config.includeScreenshots !== 'undefined' && typeof config.includeScreenshots !== 'boolean') {
      errors.push('exports.pdfOptions.includeScreenshots must be a boolean');
    }

    if (typeof config.compress !== 'undefined' && typeof config.compress !== 'boolean') {
      errors.push('exports.pdfOptions.compress must be a boolean');
    }

    return errors;
  }

  private validateNotificationConfig(config: any): string[] {
    const errors: string[] = [];

    if (config.slack) {
      if (typeof config.slack.webhookUrl !== 'string' || !config.slack.webhookUrl.startsWith('https://hooks.slack.com/')) {
        errors.push('notifications.slack.webhookUrl must be a valid Slack webhook URL');
      }

      if (typeof config.slack.channel !== 'undefined' && typeof config.slack.channel !== 'string') {
        errors.push('notifications.slack.channel must be a string');
      }

      if (typeof config.slack.enabled !== 'undefined' && typeof config.slack.enabled !== 'boolean') {
        errors.push('notifications.slack.enabled must be a boolean');
      }
    }

    if (config.email) {
      if (!config.email.smtp) {
        errors.push('notifications.email.smtp is required when email notifications are configured');
      } else {
        if (typeof config.email.smtp.host !== 'string') {
          errors.push('notifications.email.smtp.host must be a string');
        }

        if (typeof config.email.smtp.port !== 'number' || config.email.smtp.port < 1 || config.email.smtp.port > 65535) {
          errors.push('notifications.email.smtp.port must be a number between 1 and 65535');
        }

        if (typeof config.email.smtp.secure !== 'boolean') {
          errors.push('notifications.email.smtp.secure must be a boolean');
        }

        if (!config.email.smtp.auth || 
            typeof config.email.smtp.auth.user !== 'string' || 
            typeof config.email.smtp.auth.pass !== 'string') {
          errors.push('notifications.email.smtp.auth must contain user and pass as strings');
        }
      }

      if (!Array.isArray(config.email.to) || config.email.to.length === 0) {
        errors.push('notifications.email.to must be a non-empty array of email addresses');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = config.email.to.filter((email: any) => 
          typeof email !== 'string' || !emailRegex.test(email)
        );
        if (invalidEmails.length > 0) {
          errors.push('notifications.email.to contains invalid email addresses');
        }
      }

      if (typeof config.email.enabled !== 'undefined' && typeof config.email.enabled !== 'boolean') {
        errors.push('notifications.email.enabled must be a boolean');
      }
    }

    return errors;
  }

  validateFilterPreset(preset: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!preset.id || typeof preset.id !== 'string') {
      errors.push('Filter preset must have a valid id');
    }

    if (!preset.name || typeof preset.name !== 'string') {
      errors.push('Filter preset must have a valid name');
    }

    if (preset.description && typeof preset.description !== 'string') {
      errors.push('Filter preset description must be a string');
    }

    if (!preset.filters || typeof preset.filters !== 'object') {
      errors.push('Filter preset must have a filters object');
    }

    if (typeof preset.isDefault !== 'undefined' && typeof preset.isDefault !== 'boolean') {
      errors.push('Filter preset isDefault must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}