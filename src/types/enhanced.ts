/**
 * Enhanced type definitions for better type safety and code readability
 */

// Strict string literal types for better type safety
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type DeviceType = 'lighting4' | 'security1' | 'temperaturehumidity1';
export type BridgeAction = 'restart' | 'stop' | 'reset_devices' | 'reset_state';
export type SwitchState = 'On' | 'Off';

// Configuration interfaces with better structure
export interface MqttConfig {
  readonly server: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly base_topic: string;
  readonly qos: number;
  readonly retain: boolean;
  readonly version?: 3 | 4 | 5;
  readonly keepalive?: number;
  readonly ca?: string;
  readonly key?: string;
  readonly cert?: string;
  readonly client_id?: string;
}

export interface HealthcheckConfig {
  readonly enabled: boolean;
  readonly cron: string;
}

export interface FrontendConfig {
  readonly enabled: boolean;
  readonly port: number;
}

export interface HomeAssistantConfig {
  readonly discovery: boolean;
  readonly discovery_prefix?: string;
}

export interface ApplicationConfig {
  readonly mqtt: MqttConfig;
  readonly healthcheck: HealthcheckConfig;
  readonly frontend: FrontendConfig;
  readonly homeassistant?: HomeAssistantConfig;
  readonly loglevel: LogLevel;
  readonly devices: DeviceConfig[];
}

export interface DeviceConfig {
  readonly name: string;
  readonly type: DeviceType;
  readonly id: string;
  readonly enabled: boolean;
}

// Event payload interfaces
export interface RfxcomEventPayload {
  readonly id: string;
  readonly type: DeviceType;
  readonly unitCode?: number;
  readonly data?: any;
  readonly temperature?: number;
  readonly humidity?: number;
  readonly barometer?: number;
  readonly weight?: number;
  readonly group?: boolean;
}

export interface MqttMessagePayload {
  readonly topic: string;
  readonly message: string;
  readonly timestamp?: Date;
}

// Service interfaces for dependency injection
export interface IMqttService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, payload: string, options?: any): Promise<void>;
  subscribe(topics: string[]): Promise<void>;
  isConnected(): boolean;
}

export interface IRfxcomService {
  initialise(): Promise<void>;
  stop(): Promise<void>;
  onCommand(type: string, name: string, message: string, config?: DeviceConfig): void;
  getStatus(callback: (status: string) => void): void;
  subscribeProtocolsEvent(callback: (type: string, event: any) => void): void;
  onStatus(callback: (info: any) => void): void;
  onDisconnect(callback: (event: any) => void): void;
}

// Result types for better error handling
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

// Utility type for making properties optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Utility type for readonly arrays
export type ReadonlyArray<T> = readonly T[];

// Event handler types with better typing
export interface EventHandlers {
  onMqttMessage: (payload: MqttMessagePayload) => void;
  onRfxcomEvent: (payload: RfxcomEventPayload) => void;
  onError: (error: Error) => void;
  onStatusChange: (status: string) => void;
}

// Topic structure interface
export interface TopicStructure {
  readonly base: string;
  readonly command: string;
  readonly devices: string;
  readonly info: string;
  readonly will: string;
  readonly bridge: string;
}
