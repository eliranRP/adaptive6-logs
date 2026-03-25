import fs from 'fs';
import readline from 'readline';
import type { LogParser, ParsedLogEntry } from '../types';
import { logger } from '../logger';

const COMBINED_LOG_REGEX =
  /^(?<host>\S+)\s+\S+\s+\S+\s+\[(?<timestamp>[^\]]+)\]\s+"(?<request>(?:[^"\\]|\\.)*)"\s+(?<statusCode>\d{3}|-)\s+(?<bytesSent>\d+|-)\s+"(?<referer>(?:[^"\\]|\\.)*)"\s+"(?<userAgent>(?:[^"\\]|\\.)*)"\s*$/;

// Anchors on the protocol token at the end to handle spaces in URL paths
function parseRequestField(raw: string): { method: string | null; path: string | null } {
  if (!raw || raw === '-') return { method: null, path: null };

  const match = raw.match(/^(\S+)\s+(.*)\s+(HTTP\/[\d.]+)$/);
  if (!match) return { method: null, path: raw };

  return { method: match[1], path: match[2] };
}

/**
 * Parser for the Apache Combined Log Format.
 * Implements LogParser — swap this for NginxLogParser, JsonLogParser, etc.
 */
export class CombinedLogParser implements LogParser {
  private readonly skipRateWarnThreshold: number;

  constructor(options: { skipRateWarnThreshold?: number } = {}) {
    this.skipRateWarnThreshold = options.skipRateWarnThreshold ?? 0.05;
  }

  async parse(filePath: string): Promise<ParsedLogEntry[]> {
    const entries: ParsedLogEntry[] = [];
    let skipped = 0;
    let lineNumber = 0;

    const fileStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });

    await new Promise<void>((resolve, reject) => {
      fileStream.once('error', reject);
      fileStream.once('readable', resolve);
      fileStream.once('end', resolve);
    });

    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      lineNumber++;
      if (!line.trim()) continue;

      const match = COMBINED_LOG_REGEX.exec(line);
      if (!match?.groups) {
        skipped++;
        continue;
      }

      const { host, timestamp, request, statusCode, bytesSent, userAgent } = match.groups;
      const { method, path } = parseRequestField(request);

      entries.push({
        ip:         host,
        timestamp,
        method:     method ?? '-',
        path:       path   ?? '-',
        statusCode: statusCode === '-' ? 0 : parseInt(statusCode, 10),
        bytesSent:  bytesSent  === '-' ? 0 : parseInt(bytesSent, 10),
        userAgent:  userAgent  === '-' ? '' : userAgent,
      });
    }

    if (skipped > 0) {
      const skipRate = skipped / Math.max(lineNumber, 1);
      const isHighSkipRate = skipRate > this.skipRateWarnThreshold;
      const message = `Skipped ${skipped}/${lineNumber} lines` +
        (isHighSkipRate ? ` (${(skipRate * 100).toFixed(1)}% — possible format mismatch)` : '');

      isHighSkipRate
        ? logger.warn('parser', message)
        : logger.info('parser', message);
    }

    return entries;
  }
}
