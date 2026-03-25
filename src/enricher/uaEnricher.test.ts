import { describe, it, expect } from 'vitest';
import { UaEnricher } from './uaEnricher';
import type { ParsedLogEntry } from '../types';

const makeEntry = (userAgent: string): ParsedLogEntry => ({
  ip: '1.2.3.4',
  timestamp: '17/May/2015:10:05:03 +0000',
  method: 'GET',
  path: '/',
  statusCode: 200,
  bytesSent: 512,
  userAgent,
});

describe('UaEnricher', () => {
  const enricher = new UaEnricher();

  describe('When the user-agent is a Chrome browser on Windows', () => {
    it('identifies browser as Chrome and OS as Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.107 Safari/537.36';

      const result = enricher.enrich(makeEntry(ua));

      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Windows');
    });
  });

  describe('When the user-agent is Safari on Mac OS', () => {
    it('identifies browser as Safari and OS as Mac OS', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Version/7.0 Safari/537.36';

      const result = enricher.enrich(makeEntry(ua));

      expect(result.browser).toBe('Safari');
      expect(result.os).toBe('Mac OS');
    });
  });

  describe('When the user-agent is a mobile app (Instagram on Android)', () => {
    it('identifies the app name and Android OS', () => {
      const ua = 'Instagram 3.0.4 Android (8/2.2.1; 240dpi; 480x800; HTC/verizon_wwe; ADR6400L; mecha; mecha; en_US)';

      const result = enricher.enrich(makeEntry(ua));

      expect(result.os).toBe('Android');
    });
  });

  describe('When the user-agent string is empty', () => {
    it('returns Unknown for both browser and OS', () => {
      const result = enricher.enrich(makeEntry(''));

      expect(result.browser).toBe('Unknown');
      expect(result.os).toBe('Unknown');
    });
  });

  describe('When the user-agent is an unrecognised client (e.g. curl)', () => {
    it('returns Unknown for browser since ua-parser-js does not recognise it', () => {
      const ua = 'curl/7.68.0';

      const result = enricher.enrich(makeEntry(ua));

      expect(result.browser).toBe('Unknown');
    });
  });
});
