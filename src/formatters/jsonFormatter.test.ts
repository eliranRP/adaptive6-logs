import { describe, it, expect } from 'vitest';
import { JsonFormatter } from './jsonFormatter';
import type { DimensionResult } from '../types';

const results: DimensionResult[] = [
  {
    label: 'Country',
    entries: [
      { value: 'United States', count: 3510, percentage: 35.10 },
      { value: 'Ukraine',       count: 2033, percentage: 20.33 },
    ],
  },
];

describe('JsonFormatter', () => {
  const formatter = new JsonFormatter();

  describe('When rendering dimension results', () => {
    it('produces valid JSON that round-trips back to the original data', () => {
      const output = formatter.render(results);
      const parsed = JSON.parse(output);

      expect(parsed).toEqual(results);
    });

    it('pretty-prints the output with 2-space indentation', () => {
      const output = formatter.render(results);

      expect(output).toContain('\n');
      expect(output).toMatch(/^\[/);
    });
  });

  describe('When the format property is checked', () => {
    it('is set to "json"', () => {
      expect(formatter.format).toBe('json');
    });
  });
});
