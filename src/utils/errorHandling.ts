/**
 * Enhanced error handling utilities for better error management
 */

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;

  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.context = context;
  }
}

export class MqttConnectionError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'MQTT_CONNECTION_ERROR', context);
    this.name = 'MqttConnectionError';
  }
}

export class RfxcomError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'RFXCOM_ERROR', context);
    this.name = 'RfxcomError';
  }
}

export class ConfigurationError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Safely executes an async function with error handling
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context?: Record<string, any>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    throw new ApplicationError(
      `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
      'OPERATION_FAILED',
      { ...context, originalError: error }
    );
  }
}

/**
 * Type guard to check if error is an ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}
