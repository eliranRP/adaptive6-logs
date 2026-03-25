import { UAParser } from 'ua-parser-js';
import type { ParsedLogEntry, Enricher, EnrichmentResult } from '../types';

export class UaEnricher implements Enricher {
  enrich(entry: ParsedLogEntry): EnrichmentResult {
    const ua = new UAParser(entry.userAgent).getResult();
    return {
      os:      ua.os?.name      ?? 'Unknown',
      browser: ua.browser?.name ?? 'Unknown',
    };
  }
}
