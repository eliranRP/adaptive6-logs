import { CombinedLogParser } from './logParser';
import type { LogParser } from '../types';

export { CombinedLogParser } from './logParser';

export const defaultParser: LogParser = new CombinedLogParser();
