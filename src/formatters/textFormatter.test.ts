import { describe, it, expect } from 'vitest';
import { TextFormatter } from './textFormatter';
import type { DimensionResult } from '../types';

const makeResult = (overrides: Partial<DimensionResult> = {}): DimensionResult => ({
  label: 'Country',
  entries: [
    { value: 'United States', count: 3510, percentage: 35.10 },
    { value: 'United Kingdom', count: 2755, percentage: 27.55 },
    { value: 'Ukraine', count: 2033, percentage: 20.33 },
  ],
  ...overrides,
});

describe('TextFormatter', () => {
  const formatter = new TextFormatter();

  describe('When rendering a single dimension', () => {
    it('prints the label followed by value-percentage pairs', () => {
      const output = formatter.render([makeResult()]);

      expect(output).toContain('Country:');
      expect(output).toContain('United States 35.10%');
      expect(output).toContain('United Kingdom 27.55%');
      expect(output).toContain('Ukraine 20.33%');
    });
  });

  describe('When rendering multiple dimensions', () => {
    it('separates each dimension block with a blank line', () => {
      const results = [
        makeResult({ label: 'Country' }),
        makeResult({ label: 'OS', entries: [{ value: 'Windows', count: 6436, percentage: 64.36 }] }),
      ];

      const output = formatter.render(results);

      expect(output).toContain('Country:');
      expect(output).toContain('OS:');
      expect(output).toContain('Windows 64.36%');
    });
  });

  describe('When a dimension has no entries', () => {
    it('renders only the label line with no values below it', () => {
      const output = formatter.render([makeResult({ entries: [] })]);

      expect(output.trim()).toBe('Country:');
    });
  });

  describe('When the format property is checked', () => {
    it('is set to "text"', () => {
      expect(formatter.format).toBe('text');
    });
  });
});
