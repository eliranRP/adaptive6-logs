import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import { ConfigError } from '../errors';

const configSchema = z.object({
  LOG_FILE:      z.string().min(1, 'LOG_FILE is required'),
  GEOIP_DB:      z.string().default('./data/GeoLite2-Country.mmdb'),
  OUTPUT_FORMAT: z.enum(['text', 'json', 'csv']).default('text'),
});

export type Config = z.infer<typeof configSchema>;

// CLI flags take precedence over .env values
export function loadConfig(): Config {
  const args = process.argv.slice(2);
  const cliOverrides: Record<string, string> = {};

  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === '--log')    cliOverrides['LOG_FILE']      = args[i + 1];
    if (args[i] === '--db')     cliOverrides['GEOIP_DB']      = args[i + 1];
    if (args[i] === '--format') cliOverrides['OUTPUT_FORMAT'] = args[i + 1];
  }

  const raw = {
    LOG_FILE:      cliOverrides['LOG_FILE']      ?? process.env['LOG_FILE'],
    GEOIP_DB:      cliOverrides['GEOIP_DB']      ?? process.env['GEOIP_DB'],
    OUTPUT_FORMAT: cliOverrides['OUTPUT_FORMAT'] ?? process.env['OUTPUT_FORMAT'],
  };

  const result = configSchema.safeParse(raw);

  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new ConfigError(
      `Configuration invalid:\n${messages}\n\nUsage:\n  ts-node src/index.ts --log <path> [--db <path>] [--format text|json|csv]`
    );
  }

  const config = result.data;
  return {
    ...config,
    LOG_FILE: path.resolve(config.LOG_FILE),
    GEOIP_DB: path.resolve(config.GEOIP_DB),
  };
}
