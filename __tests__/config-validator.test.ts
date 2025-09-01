import { ConfigValidator } from '../src/utils/ConfigValidator';
import { AuroraReporterConfig, Theme, ExportFormat } from '../src/types';

describe('ConfigValidator', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  describe('basic validation', () => {
    it('should validate a minimal valid config', () => {
      const config: AuroraReporterConfig = {
        enabled: true,
        outputDir: './reports',
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid types', () => {
      const config: any = {
        enabled: 'true', // Should be boolean
        dashboardPort: 'invalid', // Should be number
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('port validation', () => {
    it('should accept valid port numbers', () => {
      const config: AuroraReporterConfig = {
        dashboardPort: 4200,
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid port numbers', () => {
      const config: any = {
        dashboardPort: 99999, // Too high
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('dashboardPort must be a number between 1000 and 65535');
    });
  });

  describe('theme validation', () => {
    it('should accept valid themes', () => {
      const validThemes: Theme[] = ['light', 'dark', 'auto'];

      for (const theme of validThemes) {
        const config: AuroraReporterConfig = { theme };
        const result = validator.validate(config);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid themes', () => {
      const config: any = {
        theme: 'invalid-theme',
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('theme must be one of: light, dark, auto');
    });
  });

  describe('screenshot config validation', () => {
    it('should validate screenshot quality', () => {
      const config: AuroraReporterConfig = {
        screenshots: {
          quality: 150, // Invalid - should be 1-100
        },
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('screenshots.quality must be a number between 1 and 100');
    });

    it('should validate screenshot format', () => {
      const config: AuroraReporterConfig = {
        screenshots: {
          format: 'gif' as any, // Invalid format
        },
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('screenshots.format must be one of: png, jpeg, jpg');
    });
  });

  describe('export config validation', () => {
    it('should validate export formats', () => {
      const config: AuroraReporterConfig = {
        exports: {
          allowedFormats: ['pdf', 'json', 'invalid'] as any,
        },
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exports.allowedFormats contains invalid formats');
    });
  });

  describe('warnings', () => {
    it('should generate warnings for potentially problematic values', () => {
      const config: AuroraReporterConfig = {
        retentionDays: 400, // Will generate warning
        screenshots: {
          quality: 30, // Will generate warning
        },
      };

      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});