import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigError } from '../errors';
import { loadConfig } from './env';

// Prevent dotenv from reading the real .env file during tests
vi.mock('dotenv/config', () => ({}));

describe('loadConfig', () => {
  let originalArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalArgv = process.argv;
    originalEnv  = { ...process.env };
    delete process.env['LOG_FILE'];
    delete process.env['GEOIP_DB'];
    delete process.env['OUTPUT_FORMAT'];
  });

  afterEach(() => {
    process.argv = originalArgv;
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.assign(process.env, originalEnv);
  });

  describe('When LOG_FILE is not provided', () => {
    it('throws a ConfigError with a usage hint', () => {
      process.argv = ['node', 'index.ts'];

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow('LOG_FILE');
    });
  });

  describe('When LOG_FILE is provided via a CLI flag', () => {
    it('parses it and resolves the path', () => {
      process.argv = ['node', 'index.ts', '--log', './data/apache_log.txt'];

      const config = loadConfig();

      expect(config.LOG_FILE).toContain('apache_log.txt');
    });
  });

  describe('When LOG_FILE is provided via an environment variable', () => {
    it('reads it and applies it', () => {
      process.env['LOG_FILE'] = './data/apache_log.txt';
      process.argv = ['node', 'index.ts'];

      const config = loadConfig();

      expect(config.LOG_FILE).toContain('apache_log.txt');
    });
  });

  describe('When OUTPUT_FORMAT is not provided', () => {
    it('defaults to "text"', () => {
      process.argv = ['node', 'index.ts', '--log', './data/apache_log.txt'];

      const config = loadConfig();

      expect(config.OUTPUT_FORMAT).toBe('text');
    });
  });

  describe('When an invalid OUTPUT_FORMAT is provided', () => {
    it('throws a ConfigError naming the invalid value', () => {
      process.argv = ['node', 'index.ts', '--log', './data/log.txt', '--format', 'xml'];

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow('OUTPUT_FORMAT');
    });
  });

  describe('When both a CLI flag and an env var are set for the same field', () => {
    it('the CLI flag takes precedence over the env var', () => {
      process.env['LOG_FILE'] = './data/env-log.txt';
      process.argv = ['node', 'index.ts', '--log', './data/cli-log.txt'];

      const config = loadConfig();

      expect(config.LOG_FILE).toContain('cli-log.txt');
    });
  });
});
