import { settingsService } from "../../config/settings";
import { Topic } from "../../core/models/mqtt";
import { MqttEventListener } from "../../core/services/mqtt.service";
import { IMqtt } from "../../core/services/mqtt.service";
import { MQTTOptions } from ".";

export class MockMqtt implements IMqtt {
  public topics: Topic;

  constructor() {
    this.topics = new Topic(settingsService.get().mqtt.base_topic);
  }
  async connect(): Promise<void> {}
  isConnected(): boolean {
    return true;
  }
  disconnect() {}

  addListener(listener: MqttEventListener) {}
  publishState(state: string) {}
  publish(
    topic: string,
    playload: any,
    callback: any,
    options: MQTTOptions = {},
    base = settingsService.get().mqtt.base_topic,
  ): void {}
}
