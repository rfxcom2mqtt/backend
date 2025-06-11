// Application constants
export const APP_CONSTANTS = {
  DEFAULT_MQTT_PORT: 1883,
  DEFAULT_QOS: 0,
  SAVE_INTERVAL: 1000 * 60, // 1 minute
  RFXCOM2MQTT_PREFIX: "rfxcom2mqtt_",
  DEFAULT_ENV_FILE: ".env",
  DEFAULT_UNIT_CODE: 1,
} as const;

// MQTT Topics
export const MQTT_TOPICS = {
  COMMAND: "command",
  DEVICES: "devices",
  INFO: "info",
  WILL: "will",
  BRIDGE: "bridge",
  REQUEST: "request",
  LOG_LEVEL: "log_level",
} as const;

// Device Types
export const DEVICE_TYPES = {
  LIGHTING4: "lighting4",
  SECURITY1: "security1",
  TEMPERATURE_HUMIDITY1: "temperaturehumidity1",
} as const;

// Bridge Actions
export const BRIDGE_ACTIONS = {
  RESTART: "restart",
  STOP: "stop",
  RESET_DEVICES: "reset_devices",
  RESET_STATE: "reset_state",
} as const;

// Switch States
export const SWITCH_STATES = {
  ON: "On",
  OFF: "Off",
} as const;

// Log Levels
export const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

// File Extensions
export const FILE_EXTENSIONS = {
  YAML: ".yml",
  JSON: ".json",
} as const;

// Default Configuration Values
export const DEFAULT_CONFIG = {
  HEALTHCHECK_CRON: "*/5 * * * *", // Every 5 minutes
  FRONTEND_PORT: 3000,
  MQTT_KEEPALIVE: 60,
  LOG_LEVEL: "info",
} as const;
