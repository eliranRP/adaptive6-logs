import { Reader } from '@maxmind/geoip2-node';
import type { ParsedLogEntry, Enricher, EnrichmentResult } from '../types';
import { logger } from '../logger';

export class GeoIpEnricher implements Enricher {
  private constructor(private readonly reader: Awaited<ReturnType<typeof Reader.open>>) {}

  static async create(dbPath: string): Promise<GeoIpEnricher> {
    return new GeoIpEnricher(await Reader.open(dbPath));
  }

  enrich(entry: ParsedLogEntry): EnrichmentResult {
    try {
      const geo = this.reader.country(entry.ip);
      return { country: geo.country?.names?.en ?? 'Unknown' };
    } catch (err) {
      logger.info('geoip', `No country found for IP ${entry.ip}: ${err instanceof Error ? err.message : String(err)}`);
      return { country: 'Unknown' };
    }
  }
}
