import { MQTTOptions } from "../../adapters/mqtt";
import { MQTTMessage, Topic } from "../models/mqtt";

export type MqttPayload = string | Record<string, unknown> | Buffer;
export type MqttCallback = (error?: Error) => void;

export interface MqttEventListener {
  subscribeTopic(): string[];
  onMQTTMessage(data: MQTTMessage): void;
}

export interface IMqtt {
  topics: Topic;
  addListener(listener: MqttEventListener): void;
  publish(
    topic: string,
    payload: MqttPayload,
    callback: MqttCallback,
    options: MQTTOptions,
    base: string,
  ): void;
  publish(
    topic: string,
    payload: MqttPayload,
    callback: MqttCallback,
    options: MQTTOptions,
  ): void;
  publish(topic: string, payload: MqttPayload, callback: MqttCallback): void;
  publishState(state: string): void;
  connect(): Promise<void>;
  isConnected(): boolean;
  disconnect(): void;
}
