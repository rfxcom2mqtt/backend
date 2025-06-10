import { MQTTMessage } from "../models/mqtt";

export interface MqttEventListener {
  subscribeTopic(): string[];
  onMQTTMessage(data: MQTTMessage): void;
}
