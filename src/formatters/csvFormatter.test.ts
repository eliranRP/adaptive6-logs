import { describe, it, expect } from 'vitest';
import { CsvFormatter } from './csvFormatter';
import type { DimensionResult } from '../types';

describe('CsvFormatter', () => {
  const formatter = new CsvFormatter();

  describe('When rendering standard dimension results', () => {
    it('includes a header row and one data row per entry', () => {
      const results: DimensionResult[] = [
        {
          label: 'Country',
          entries: [{ value: 'United States', count: 3510, percentage: 35.10 }],
        },
      ];

      const rows = formatter.render(results).split('\n');

      expect(rows[0]).toBe('dimension,value,count,percentage');
      expect(rows[1]).toBe('Country,United States,3510,35.10');
    });
  });

  describe('When a value contains a comma', () => {
    it('wraps the value in double quotes', () => {
      const results: DimensionResult[] = [
        {
          label: 'Browser',
          entries: [{ value: 'Samsung, Browser', count: 10, percentage: 1.00 }],
        },
      ];

      const output = formatter.render(results);

      expect(output).toContain('"Samsung, Browser"');
    });
  });

  describe('When a value contains a double quote', () => {
    it('escapes the quote by doubling it inside the quoted field', () => {
      const results: DimensionResult[] = [
        {
          label: 'Browser',
          entries: [{ value: 'Say "Hi"', count: 5, percentage: 0.50 }],
        },
      ];

      const output = formatter.render(results);

      expect(output).toContain('"Say ""Hi"""');
    });
  });

  describe('When the format property is checked', () => {
    it('is set to "csv"', () => {
      expect(formatter.format).toBe('csv');
    });
  });
});
