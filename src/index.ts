import { loadConfig }        from './config/env';
import { LogPipeline }       from './pipeline/logPipeline';
import { CombinedLogParser } from './parser';
import { GeoIpEnricher }     from './enricher/geoIpEnricher';
import { UaEnricher }        from './enricher/uaEnricher';
import { countryDimension }  from './dimensions/countryDimension';
import { osDimension }       from './dimensions/osDimension';
import { browserDimension }  from './dimensions/browserDimension';
import { getFormatter }      from './formatters';
import { ConfigError, PipelineError } from './errors';
import { logger } from './logger';

async function main(): Promise<void> {
  const config = loadConfig();

  const output = await LogPipeline
    .create()
    .setSource(config.LOG_FILE)
    .setParser(new CombinedLogParser())
    .addEnricher(GeoIpEnricher.create(config.GEOIP_DB))
    .addEnricher(new UaEnricher())
    .addDimension(countryDimension)
    .addDimension(osDimension)
    .addDimension(browserDimension)
    .setFormatter(getFormatter(config.OUTPUT_FORMAT))
    .run();

  process.stdout.write(output + '\n');
}

main().catch((err: unknown) => {
  if (err instanceof ConfigError || err instanceof PipelineError) {
    logger.error(err.name, err.message);
  } else {
    logger.error('fatal', err instanceof Error ? err.message : String(err));
  }
  process.exit(1);
});
