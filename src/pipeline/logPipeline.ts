import type {
  LogParser,
  Enricher,
  Dimension,
  ReportFormatter,
  EnrichedLogEntry,
  EnrichmentResult,
} from '../types';
import { aggregate } from '../aggregator/aggregator';
import { PipelineError } from '../errors';

interface ValidatedPipeline {
  source: string;
  parser: LogParser;
  formatter: ReportFormatter;
  dimensions: Dimension[];
}

export class LogPipeline {
  private _source?: string;
  private _parser?: LogParser;
  private _enrichers: Array<Enricher | Promise<Enricher>> = [];
  private _dimensions: Dimension[] = [];
  private _formatter?: ReportFormatter;

  static create(): LogPipeline {
    return new LogPipeline();
  }

  setSource(filePath: string): this {
    this._source = filePath;
    return this;
  }

  setParser(parser: LogParser): this {
    this._parser = parser;
    return this;
  }

  // Accepts both sync enrichers and async ones (e.g. GeoIpEnricher.create())
  addEnricher(enricher: Enricher | Promise<Enricher>): this {
    this._enrichers.push(enricher);
    return this;
  }

  addDimension(dimension: Dimension): this {
    this._dimensions.push(dimension);
    return this;
  }

  setFormatter(formatter: ReportFormatter): this {
    this._formatter = formatter;
    return this;
  }

  async run(): Promise<string> {
    const validated = this.validate();

    const parsed    = await validated.parser.parse(validated.source);
    const enrichers = await Promise.all(this._enrichers);

    const enriched = parsed.map((entry): EnrichedLogEntry => {
      const extra = enrichers.reduce<EnrichmentResult>(
        (acc, enricher) => ({ ...acc, ...enricher.enrich(entry) }),
        {}
      );
      return {
        ...entry,
        country: extra.country ?? 'Unknown',
        os:      extra.os      ?? 'Unknown',
        browser: extra.browser ?? 'Unknown',
      };
    });

    const results = aggregate(enriched, validated.dimensions);
    return validated.formatter.render(results);
  }

  private validate(): ValidatedPipeline {
    if (!this._source)                 throw new PipelineError('Log source not set — call setSource().');
    if (!this._parser)                 throw new PipelineError('Parser not set — call setParser().');
    if (!this._formatter)              throw new PipelineError('Formatter not set — call setFormatter().');
    if (this._dimensions.length === 0) throw new PipelineError('No dimensions added — call addDimension().');

    return {
      source:     this._source,
      parser:     this._parser,
      formatter:  this._formatter,
      dimensions: this._dimensions,
    };
  }
}
