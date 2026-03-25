import { describe, it, expect, vi } from 'vitest';
import { LogPipeline } from './logPipeline';
import { PipelineError } from '../errors';
import type { LogParser, Enricher, Dimension, ReportFormatter, ParsedLogEntry, EnrichedLogEntry, DimensionResult } from '../types';

const makeEntry = (): ParsedLogEntry => ({
  ip: '83.149.9.216',
  timestamp: '17/May/2015:10:05:03 +0000',
  method: 'GET',
  path: '/index.html',
  statusCode: 200,
  bytesSent: 1024,
  userAgent: 'Mozilla/5.0',
});

const stubParser    = (entries: ParsedLogEntry[] = [makeEntry()]): LogParser => ({
  parse: vi.fn().mockResolvedValue(entries),
});
const stubEnricher  = (): Enricher => ({
  enrich: vi.fn().mockReturnValue({ country: 'United States', os: 'Windows', browser: 'Chrome' }),
});
const stubDimension = (): Dimension => ({
  label: 'Country',
  extract: (e: EnrichedLogEntry) => e.country,
});
const stubFormatter = (): ReportFormatter => ({
  format: 'text',
  render: vi.fn().mockReturnValue('Country:\nUnited States 100.00%'),
});

describe('LogPipeline', () => {
  describe('When run() is called without setSource()', () => {
    it('throws a PipelineError describing the missing step', async () => {
      const pipeline = LogPipeline.create()
        .setParser(stubParser())
        .addDimension(stubDimension())
        .setFormatter(stubFormatter());

      await expect(pipeline.run()).rejects.toThrow(PipelineError);
      await expect(pipeline.run()).rejects.toThrow('setSource');
    });
  });

  describe('When run() is called without setParser()', () => {
    it('throws a PipelineError describing the missing step', async () => {
      const pipeline = LogPipeline.create()
        .setSource('./data/log.txt')
        .addDimension(stubDimension())
        .setFormatter(stubFormatter());

      await expect(pipeline.run()).rejects.toThrow(PipelineError);
      await expect(pipeline.run()).rejects.toThrow('setParser');
    });
  });

  describe('When run() is called without any addDimension()', () => {
    it('throws a PipelineError describing the missing step', async () => {
      const pipeline = LogPipeline.create()
        .setSource('./data/log.txt')
        .setParser(stubParser())
        .setFormatter(stubFormatter());

      await expect(pipeline.run()).rejects.toThrow(PipelineError);
      await expect(pipeline.run()).rejects.toThrow('addDimension');
    });
  });

  describe('When run() is called without setFormatter()', () => {
    it('throws a PipelineError describing the missing step', async () => {
      const pipeline = LogPipeline.create()
        .setSource('./data/log.txt')
        .setParser(stubParser())
        .addDimension(stubDimension());

      await expect(pipeline.run()).rejects.toThrow(PipelineError);
      await expect(pipeline.run()).rejects.toThrow('setFormatter');
    });
  });

  describe('When all required steps are configured', () => {
    it('runs parse → enrich → aggregate → render and returns the formatted output', async () => {
      const formatter = stubFormatter();
      const output = await LogPipeline
        .create()
        .setSource('./data/log.txt')
        .setParser(stubParser())
        .addEnricher(stubEnricher())
        .addDimension(stubDimension())
        .setFormatter(formatter)
        .run();

      expect(output).toBe('Country:\nUnited States 100.00%');
      expect(formatter.render).toHaveBeenCalledOnce();
    });

    it('resolves async enrichers (e.g. Promise<Enricher>) before running', async () => {
      const asyncEnricher = Promise.resolve(stubEnricher());

      await expect(
        LogPipeline.create()
          .setSource('./data/log.txt')
          .setParser(stubParser())
          .addEnricher(asyncEnricher)
          .addDimension(stubDimension())
          .setFormatter(stubFormatter())
          .run()
      ).resolves.not.toThrow();
    });

    it('uses Unknown as fallback when enricher returns no country', async () => {
      const emptyEnricher: Enricher = { enrich: vi.fn().mockReturnValue({}) };
      const capturedResults: DimensionResult[] = [];
      const capturingFormatter: ReportFormatter = {
        format: 'text',
        render: (results) => { capturedResults.push(...results); return ''; },
      };
      const countryDim: Dimension = { label: 'Country', extract: (e) => e.country };

      await LogPipeline.create()
        .setSource('./data/log.txt')
        .setParser(stubParser())
        .addEnricher(emptyEnricher)
        .addDimension(countryDim)
        .setFormatter(capturingFormatter)
        .run();

      expect(capturedResults[0].entries[0].value).toBe('Unknown');
    });
  });
});
