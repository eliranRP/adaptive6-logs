import { describe, it, expect } from 'vitest';
import { countryDimension } from './countryDimension';
import { osDimension }      from './osDimension';
import { browserDimension } from './browserDimension';
import type { EnrichedLogEntry } from '../types';

const makeEntry = (overrides: Partial<EnrichedLogEntry> = {}): EnrichedLogEntry => ({
  ip: '1.2.3.4',
  timestamp: '17/May/2015:10:05:03 +0000',
  method: 'GET',
  path: '/',
  statusCode: 200,
  bytesSent: 100,
  userAgent: 'Mozilla/5.0',
  country: 'United States',
  os: 'Windows',
  browser: 'Chrome',
  ...overrides,
});

describe('countryDimension', () => {
  it('extracts the country field from an entry', () => {
    expect(countryDimension.extract(makeEntry({ country: 'Ukraine' }))).toBe('Ukraine');
  });

  it('returns null when country is an empty string', () => {
    expect(countryDimension.extract(makeEntry({ country: '' }))).toBeNull();
  });
});

describe('osDimension', () => {
  it('extracts the os field from an entry', () => {
    expect(osDimension.extract(makeEntry({ os: 'Mac OS' }))).toBe('Mac OS');
  });

  it('returns null when os is an empty string', () => {
    expect(osDimension.extract(makeEntry({ os: '' }))).toBeNull();
  });
});

describe('browserDimension', () => {
  it('extracts the browser field from an entry', () => {
    expect(browserDimension.extract(makeEntry({ browser: 'Firefox' }))).toBe('Firefox');
  });

  it('returns null when browser is an empty string', () => {
    expect(browserDimension.extract(makeEntry({ browser: '' }))).toBeNull();
  });
});
