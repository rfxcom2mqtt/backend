// Common types used across the application
export interface ExitCallback {
  (code: number, restart: boolean): void;
}

export interface ActionCallback {
  (action: Action): void;
}

export interface StatusCallback {
  (status: string): void;
}

export interface ErrorCallback {
  (error: any): void;
}

export interface PublishCallback {
  (error: any): void;
}

// Configuration interfaces
export interface MqttConnectionConfig {
  server: string;
  port: string;
  username?: string;
  password?: string;
  qos: number;
  retain: boolean;
  version?: number;
  keepalive?: number;
  ca?: string;
  key?: string;
  cert?: string;
  client_id?: string;
}

// Event handler types
export interface RfxcomEventHandler {
  (type: any, evt: any): void;
}

export interface MqttMessageHandler {
  (topic: string, message: any): void;
}

import { Action } from '../core/models';
