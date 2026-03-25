import type { ReportFormatter, DimensionResult } from '../types';

/** JSON formatter — outputs the full DimensionResult array as pretty-printed JSON. */
export class JsonFormatter implements ReportFormatter {
  readonly format = 'json' as const;

  render(results: DimensionResult[]): string {
    return JSON.stringify(results, null, 2);
  }
}
