import type { Enricher } from '../types';
import { GeoIpEnricher } from './geoIpEnricher';
import { UaEnricher }    from './uaEnricher';

export async function createEnrichers(geoIpDbPath: string): Promise<Enricher[]> {
  return [
    await GeoIpEnricher.create(geoIpDbPath),
    new UaEnricher(),
  ];
}
