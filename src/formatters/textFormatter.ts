import type { ReportFormatter, DimensionResult } from '../types';

export class TextFormatter implements ReportFormatter {
  readonly format = 'text' as const;

  render(results: DimensionResult[]): string {
    return results
      .map((dim) => {
        const lines = [`${dim.label}:`];
        for (const e of dim.entries) {
          lines.push(`${e.value} ${e.percentage.toFixed(2)}%`);
        }
        return lines.join('\n');
      })
      .join('\n\n');
  }
}
