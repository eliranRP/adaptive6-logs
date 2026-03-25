type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, component: string, message: string): void {
  process.stderr.write(`[${level}] ${component}: ${message}\n`);
}

export const logger = {
  info:  (component: string, message: string) => log('info',  component, message),
  warn:  (component: string, message: string) => log('warn',  component, message),
  error: (component: string, message: string) => log('error', component, message),
};
