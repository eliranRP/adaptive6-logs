import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CombinedLogParser } from './logParser';

const VALID_LINE =
  '83.149.9.216 - - [17/May/2015:10:05:03 +0000] "GET /presentations/logstash.pdf HTTP/1.1" 200 3478 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.77 Safari/537.36"';

const tempFiles: string[] = [];

function writeTempLog(content: string): string {
  const filePath = join(tmpdir(), `log-test-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  writeFileSync(filePath, content, 'utf-8');
  tempFiles.push(filePath);
  return filePath;
}

afterEach(() => {
  tempFiles.splice(0).forEach((f) => { try { unlinkSync(f); } catch {} });
});

describe('CombinedLogParser', () => {
  describe('When parsing a standard Apache Combined Log Format line', () => {
    it('extracts ip, method, path, status, bytes, and userAgent correctly', async () => {
      const parser = new CombinedLogParser();
      const filePath = writeTempLog(VALID_LINE);

      const [entry] = await parser.parse(filePath);

      expect(entry).toMatchObject({
        ip:         '83.149.9.216',
        method:     'GET',
        path:       '/presentations/logstash.pdf',
        statusCode: 200,
        bytesSent:  3478,
      });
      expect(entry.userAgent).toContain('Chrome');
    });
  });

  describe('When the request field contains a URL with spaces', () => {
    it('captures the full path including the space', async () => {
      const line =
        '1.2.3.4 - - [17/May/2015:10:05:03 +0000] "GET /my file.html HTTP/1.1" 200 100 "-" "curl/7.0"';
      const parser = new CombinedLogParser();

      const [entry] = await parser.parse(writeTempLog(line));

      expect(entry.path).toBe('/my file.html');
    });
  });

  describe('When optional fields contain a dash placeholder', () => {
    it('maps bytes-sent dash to 0', async () => {
      const line =
        '1.2.3.4 - - [17/May/2015:10:05:03 +0000] "GET / HTTP/1.0" 304 - "-" "-"';
      const parser = new CombinedLogParser();

      const [entry] = await parser.parse(writeTempLog(line));

      expect(entry.bytesSent).toBe(0);
    });

    it('maps user-agent dash to an empty string', async () => {
      const line =
        '1.2.3.4 - - [17/May/2015:10:05:03 +0000] "GET / HTTP/1.0" 200 512 "-" "-"';
      const parser = new CombinedLogParser();

      const [entry] = await parser.parse(writeTempLog(line));

      expect(entry.userAgent).toBe('');
    });
  });

  describe('When the request field is a bare dash (HTTP 400-style bad request)', () => {
    it('still captures the entry with method and path set to dash', async () => {
      const line =
        '1.2.3.4 - - [17/May/2015:10:05:03 +0000] "-" 400 0 "-" "BadClient/1.0"';
      const parser = new CombinedLogParser();

      const [entry] = await parser.parse(writeTempLog(line));

      expect(entry.method).toBe('-');
      expect(entry.path).toBe('-');
      expect(entry.statusCode).toBe(400);
    });
  });

  describe('When the file contains blank lines', () => {
    it('skips them and returns only valid entries', async () => {
      const content = `\n${VALID_LINE}\n\n${VALID_LINE}\n`;
      const parser = new CombinedLogParser();

      const entries = await parser.parse(writeTempLog(content));

      expect(entries).toHaveLength(2);
    });
  });

  describe('When the file is empty', () => {
    it('returns an empty array', async () => {
      const parser = new CombinedLogParser();

      const entries = await parser.parse(writeTempLog(''));

      expect(entries).toHaveLength(0);
    });
  });

  describe('When a line does not match the Combined Log Format', () => {
    it('skips the malformed line and still returns valid entries', async () => {
      const content = `this is not a log line\n${VALID_LINE}`;
      const parser = new CombinedLogParser();

      const entries = await parser.parse(writeTempLog(content));

      expect(entries).toHaveLength(1);
    });
  });

  describe('When the file path does not exist', () => {
    it('rejects with an error describing the missing file', async () => {
      const parser = new CombinedLogParser();

      await expect(parser.parse('/nonexistent/path/to/log.txt')).rejects.toThrow();
    });
  });

  describe('When parsing multiple valid lines', () => {
    it('returns one entry per line', async () => {
      const content = Array(5).fill(VALID_LINE).join('\n');
      const parser = new CombinedLogParser();

      const entries = await parser.parse(writeTempLog(content));

      expect(entries).toHaveLength(5);
    });
  });
});
