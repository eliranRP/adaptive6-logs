import type { ReportFormatter, OutputFormat } from '../types';
import { TextFormatter } from './textFormatter';
import { JsonFormatter } from './jsonFormatter';
import { CsvFormatter }  from './csvFormatter';

export function getFormatter(format: OutputFormat): ReportFormatter {
  switch (format) {
    case 'text': return new TextFormatter();
    case 'json': return new JsonFormatter();
    case 'csv':  return new CsvFormatter();
  }
}
