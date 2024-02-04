export interface MqttEventListener {
  subscribeTopic(): string[];
  onMQTTMessage(data: MQTTMessage): void;
}
export interface MQTTMessage {
  topic: string;
  message: any;
}
