import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeoIpEnricher } from './geoIpEnricher';
import type { ParsedLogEntry } from '../types';

const makeEntry = (ip: string): ParsedLogEntry => ({
  ip,
  timestamp: '17/May/2015:10:05:03 +0000',
  method: 'GET',
  path: '/',
  statusCode: 200,
  bytesSent: 512,
  userAgent: 'Mozilla/5.0',
});

vi.mock('@maxmind/geoip2-node', () => ({
  Reader: {
    open: vi.fn(),
  },
}));

describe('GeoIpEnricher', () => {
  let mockCountryLookup: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const { Reader } = await import('@maxmind/geoip2-node');
    mockCountryLookup = vi.fn();
    vi.mocked(Reader.open).mockResolvedValue({ country: mockCountryLookup } as never);
  });

  describe('When the IP resolves to a known country', () => {
    it('returns the English country name', async () => {
      mockCountryLookup.mockReturnValue({ country: { names: { en: 'United States' } } });
      const enricher = await GeoIpEnricher.create('/fake/GeoLite2-Country.mmdb');

      const result = enricher.enrich(makeEntry('83.149.9.216'));

      expect(result.country).toBe('United States');
    });
  });

  describe('When the IP is not found in the database', () => {
    it('returns Unknown instead of throwing', async () => {
      mockCountryLookup.mockImplementation(() => { throw new Error('IP not found'); });
      const enricher = await GeoIpEnricher.create('/fake/GeoLite2-Country.mmdb');

      const result = enricher.enrich(makeEntry('0.0.0.0'));

      expect(result.country).toBe('Unknown');
    });
  });

  describe('When the database record is missing the country name', () => {
    it('returns Unknown as a safe fallback', async () => {
      mockCountryLookup.mockReturnValue({ country: { names: {} } });
      const enricher = await GeoIpEnricher.create('/fake/GeoLite2-Country.mmdb');

      const result = enricher.enrich(makeEntry('1.2.3.4'));

      expect(result.country).toBe('Unknown');
    });
  });
});
