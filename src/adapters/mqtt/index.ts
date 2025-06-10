import { QoS } from "mqtt-packet";
import Mqtt from "./Mqtt";
import { MockMqtt } from "./MockMqtt";
import { settingsService } from "../../config/settings";
import { MqttEventListener } from "../../core/services/mqtt.service";

export interface MQTTOptions {
  qos?: QoS;
  retain?: boolean;
}

export class Topic {
  base: string;
  will: string;
  devices: string;
  info: string;

  constructor(baseTopic: string) {
    this.base = baseTopic;
    this.devices = "devices";
    this.will = "bridge/status";
    this.info = "bridge/info";
  }
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

export function getMqttInstance(): IMqtt {
  return settingsService.get().mqtt.server === "mock"
    ? new MockMqtt()
    : new Mqtt();
}
