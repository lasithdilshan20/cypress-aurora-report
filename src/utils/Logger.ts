export class Logger {
  private context: string;
  private enableDebug: boolean;

  constructor(context: string, enableDebug: boolean = false) {
    this.context = context;
    this.enableDebug = enableDebug;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}` : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.enableDebug) {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    console.info(this.formatMessage('info', message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message, ...args));
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message, ...args));
  }

  setDebugEnabled(enabled: boolean): void {
    this.enableDebug = enabled;
  }
}