import { QoS } from "mqtt-packet";
import { settingsService } from "../../config/settings";
import { IMqtt } from "../../core/services/mqtt.service";
import { MockMqtt } from "./MockMqtt";
import Mqtt from "./Mqtt";

export interface MQTTOptions {
  qos?: QoS;
  retain?: boolean;
}

export interface MqttConnectionConfig {
  server: string;
  port: number;
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

export function getMqttInstance(): IMqtt {
  return settingsService.get().mqtt.server === "mock"
    ? new MockMqtt()
    : new Mqtt();
}
