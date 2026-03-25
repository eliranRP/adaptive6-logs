export interface ParsedLogEntry {
  readonly ip: string;
  readonly timestamp: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly bytesSent: number;
  readonly userAgent: string;
}

export interface EnrichedLogEntry extends ParsedLogEntry {
  readonly country: string;
  readonly os: string;
  readonly browser: string;
}

export interface FrequencyEntry {
  readonly value: string;
  readonly count: number;
  readonly percentage: number; // 0–100, 2 decimal places
}

export interface DimensionResult {
  readonly label: string;
  readonly entries: FrequencyEntry[];
}

// Implement this to add a new log format (e.g. Nginx, W3C, JSON).
// Pass the instance into main() or register it as the default in src/parser/index.ts.
export interface LogParser {
  parse(filePath: string): Promise<ParsedLogEntry[]>;
}

// Implement this to add a new enrichment source (e.g. ASN lookup, referrer parsing).
// Register the instance in src/enricher/index.ts.
export type EnrichmentResult = Partial<Omit<EnrichedLogEntry, keyof ParsedLogEntry>>;

export interface Enricher {
  enrich(entry: ParsedLogEntry): EnrichmentResult;
}

// Implement this to add a new dimension (e.g. Device, HTTP Status).
// Register the instance in src/dimensions/index.ts.
export interface Dimension {
  readonly label: string;
  extract(entry: EnrichedLogEntry): string | null;
}

// Implement this to add a new output format (e.g. HTML).
// Register the class in src/formatters/index.ts.
export interface ReportFormatter {
  readonly format: OutputFormat;
  render(results: DimensionResult[]): string;
}

export type OutputFormat = 'text' | 'json' | 'csv';
