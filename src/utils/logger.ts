import winston, { createLogger, transports, format } from "winston";
import Transport = require("winston-transport");

/**
 * Interface for log event listeners
 */
export interface LogEventListener {
  /**
   * Called when a log event occurs
   * @param data The log data
   */
  onLog(data: unknown): void;
}

/**
 * Supported log levels
 */
export type LogLevel = "warn" | "debug" | "info" | "error";

/**
 * Winston-specific log levels
 */
type WinstonLogLevel = "warning" | "debug" | "info" | "error";

/**
 * Converts application log level to Winston log level
 * @param level The application log level
 * @returns The corresponding Winston log level
 */
const logToWinstonLevel = (level: LogLevel): WinstonLogLevel =>
  level === "warn" ? "warning" : level;

/**
 * Converts Winston log level to application log level
 * @param level The Winston log level
 * @returns The corresponding application log level
 */
const winstonToLevel = (level: WinstonLogLevel): LogLevel =>
  level === "warning" ? "warn" : level;

/**
 * Custom Winston transport that forwards logs to a LogEventListener
 */
export class LogEventTransport extends Transport {
  private logEventListener: LogEventListener;
  
  /**
   * Creates a new LogEventTransport
   * @param logEventListener The listener to forward logs to
   * @param options Transport options
   */
  constructor(
    logEventListener: LogEventListener,
    options?: Transport.TransportStreamOptions,
  ) {
    super(options);
    this.logEventListener = logEventListener;
  }

  /**
   * Logs a message through the transport
   * @param info The log information
   * @param callback Callback function to call when done
   */
  log(info: unknown, callback: () => void): void {
    this.logEventListener.onLog(info);
    callback();
  }
}

/**
 * Logger class that wraps Winston logger functionality
 */
export class Logger {
  private logger: winston.Logger;
  public readonly name: string;
  private transportsToUse: winston.transport[];

  /**
   * Creates a new Logger instance
   * @param name The logger name
   */
  constructor(name: string) {
    this.name = name;
    this.transportsToUse = [new transports.Console()];
    
    this.logger = createLogger({
      transports: this.transportsToUse,
      format: format.combine(
        format.label({ label: name }),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Using 24-hour format
        format.printf((info) => {
          const level = info.level.toUpperCase();
          return `[${info.timestamp}][${info.label}] ${level}: ${info.message}`;
        }),
      ),
    });
  }

  /**
   * Gets the current log level
   * @returns The current log level
   */
  getLevel(): LogLevel {
    return winstonToLevel(this.transportsToUse[0].level as WinstonLogLevel);
  }

  /**
   * Sets the log level for all transports
   * @param level The log level to set
   */
  setLevel(level: LogLevel): void {
    const winstonLevel = logToWinstonLevel(level);
    this.logger.transports.forEach(transport => {
      transport.level = winstonLevel;
    });
  }

  /**
   * Adds a transport to the logger
   * @param transport The transport to add
   */
  addTransport(transport: winston.transport): void {
    this.logger.add(transport);
  }

  /**
   * Logs a warning message
   * @param message The message to log
   */
  warn(message: string): void {
    // winston.config.syslog.levels doesn't have warn, but is required for syslog.
    // Use warning method for compatibility with tests
    if (typeof this.logger.warning === 'function') {
      this.logger.warning(message);
    } else if (typeof this.logger.warn === 'function') {
      this.logger.warn(message);
    }
  }

  /**
   * Alias for warn() - logs a warning message
   * @param message The message to log
   */
  warning(message: string): void {
    this.warn(message);
  }

  /**
   * Logs an info message
   * @param message The message to log
   */
  info(message: string): void {
    this.logger.info(message);
  }

  /**
   * Logs a debug message
   * @param message The message to log
   */
  debug(message: string): void {
    this.logger.debug(message);
  }

  /**
   * Logs an error message
   * @param message The message to log
   */
  error(message: string): void {
    this.logger.error(message);
  }
}

/**
 * Factory class for creating and managing loggers
 */
class LoggerFactory {
  private loggers: Map<string, Logger> = new Map();
  private default?: Logger;
  private readonly DEFAULT_LOGGER_NAME = "GATEWAY";

  /**
   * Sets the log level for all loggers
   * @param level The log level to set
   */
  setLevel(level: LogLevel): void {
    // Use Array.from to convert Map values to an array for compatibility
    Array.from(this.loggers.values()).forEach(logger => {
      logger.setLevel(level);
    });
  }

  /**
   * Gets or creates a logger with the specified name
   * @param name The logger name
   * @returns The logger instance
   */
  public getLogger(name: string): Logger {
    // Log the creation if default logger exists
    if (this.default) {
      this.default.debug(`Getting logger: ${name}`);
    }

    // Check if logger already exists
    let logger = this.loggers.get(name);
    
    // Create new logger if it doesn't exist
    if (!logger) {
      logger = new Logger(name);
      this.loggers.set(name, logger);
      
      if (this.default) {
        this.default.debug(`Created new logger: ${name}`);
      }
    }
    
    return logger;
  }

  /**
   * Adds a transport to all loggers
   * @param transport The transport to add
   */
  addTransport(transport: winston.transport): void {
    // Use Array.from to convert Map entries to an array for compatibility
    Array.from(this.loggers.entries()).forEach(([name, logger]) => {
      if (this.default) {
        this.default.debug(`Adding transport to logger: ${name}`);
      }
      logger.addTransport(transport);
    });
  }

  /**
   * Gets the default logger
   * @returns The default logger
   */
  public getDefault(): Logger {
    if (!this.default) {
      this.default = this.getLogger(this.DEFAULT_LOGGER_NAME);
    }
    return this.default;
  }
}

// Create singleton instances
const loggerFactory = new LoggerFactory();
const logger = loggerFactory.getDefault();

// Export public API
export { loggerFactory, logger };
