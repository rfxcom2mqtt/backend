import { MQTTOptions } from "../../adapters/mqtt";
import { MQTTMessage, Topic } from "../models/mqtt";

export interface MqttEventListener {
  subscribeTopic(): string[];
  onMQTTMessage(data: MQTTMessage): void;
}

export interface IMqtt {
  topics: Topic;
  addListener(listener: MqttEventListener);
  publish(
    topic: string,
    playload: any,
    callback: any,
    options: MQTTOptions,
    base,
  ): void;
  publish(
    topic: string,
    playload: any,
    callback: any,
    options: MQTTOptions,
  ): void;
  publish(topic: string, playload: any, callback: any): void;
  publishState(state: string);
  connect(): Promise<void>;
  isConnected(): boolean;
  disconnect();
}