import { describe, it, expect } from 'vitest';
import { aggregate } from './aggregator';
import type { EnrichedLogEntry, Dimension } from '../types';

const makeEntry = (overrides: Partial<EnrichedLogEntry> = {}): EnrichedLogEntry => ({
  ip: '83.149.9.216',
  timestamp: '17/May/2015:10:05:03 +0000',
  method: 'GET',
  path: '/presentations/logstash.pdf',
  statusCode: 200,
  bytesSent: 3478,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36',
  country: 'United States',
  os: 'Mac OS',
  browser: 'Chrome',
  ...overrides,
});

const countryDim: Dimension = { label: 'Country', extract: (e) => e.country || null };

describe('aggregate', () => {
  describe('When the entries list is empty', () => {
    it('returns an empty frequency list for each dimension', () => {
      const result = aggregate([], [countryDim]);

      expect(result).toEqual([{ label: 'Country', entries: [] }]);
    });
  });

  describe('When entries contain values', () => {
    it('counts each distinct value and sorts by frequency descending', () => {
      const entries = [
        makeEntry({ country: 'United States' }),
        makeEntry({ country: 'United States' }),
        makeEntry({ country: 'Ukraine' }),
      ];

      const [{ entries: countries }] = aggregate(entries, [countryDim]);

      expect(countries[0]).toMatchObject({ value: 'United States', count: 2 });
      expect(countries[1]).toMatchObject({ value: 'Ukraine', count: 1 });
    });

    it('calculates percentages correctly to two decimal places', () => {
      const entries = [
        makeEntry({ country: 'United States' }),
        makeEntry({ country: 'United States' }),
        makeEntry({ country: 'United States' }),
        makeEntry({ country: 'Ukraine' }),
      ];

      const [{ entries: countries }] = aggregate(entries, [countryDim]);

      expect(countries[0].percentage).toBe(75);
      expect(countries[1].percentage).toBe(25);
    });

    it('skips entries where the dimension returns null', () => {
      const nullDim: Dimension = { label: 'Country', extract: () => null };
      const entries = [makeEntry(), makeEntry()];

      const [{ entries: result }] = aggregate(entries, [nullDim]);

      expect(result).toHaveLength(0);
    });

    it('skips entries where the dimension returns an empty string', () => {
      const entries = [
        makeEntry({ country: 'United States' }),
        makeEntry({ country: '' }),
      ];

      const [{ entries: result }] = aggregate(entries, [countryDim]);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('United States');
    });
  });

  describe('When multiple dimensions are provided', () => {
    it('returns one result block per dimension in the same order', () => {
      const dims: Dimension[] = [
        { label: 'Country', extract: (e) => e.country },
        { label: 'OS',      extract: (e) => e.os },
        { label: 'Browser', extract: (e) => e.browser },
      ];

      const result = aggregate([makeEntry()], dims);

      expect(result.map((r) => r.label)).toEqual(['Country', 'OS', 'Browser']);
    });
  });
});
