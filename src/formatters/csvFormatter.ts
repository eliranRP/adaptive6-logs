import type { ReportFormatter, DimensionResult } from '../types';

// Wrap in quotes if the value contains a comma, quote, or newline
function csvEscape(value: string): string {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export class CsvFormatter implements ReportFormatter {
  readonly format = 'csv' as const;

  render(results: DimensionResult[]): string {
    const rows: string[] = ['dimension,value,count,percentage'];

    for (const dim of results) {
      for (const e of dim.entries) {
        rows.push(`${dim.label},${csvEscape(e.value)},${e.count},${e.percentage.toFixed(2)}`);
      }
    }

    return rows.join('\n');
  }
}
