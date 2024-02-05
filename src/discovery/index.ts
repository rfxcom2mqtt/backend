"use strict";

import IRfxcom from "../rfxcom/interface";
import { Settings } from "../settings";
import Mqtt from "../mqtt";
import { MQTTMessage, MqttEventListener } from "../models/mqtt";
import StateStore from "../store/state";
import HomeassistantDiscovery from "./HomeassistantDiscovery";
import BridgeDiscovery from "./BridgeDiscovery";

export default class Discovery implements MqttEventListener {
  protected baseTopic: string;
  homeassistant: HomeassistantDiscovery;
  bridge: BridgeDiscovery;

  constructor(
    mqtt: Mqtt,
    rfxtrx: IRfxcom,
    config: Settings,
    state: StateStore,
  ) {
    this.baseTopic = mqtt.topics.base;
    this.homeassistant = new HomeassistantDiscovery(
      mqtt,
      rfxtrx,
      config,
      state,
    );
    this.bridge = new BridgeDiscovery(mqtt, rfxtrx, config);
  }

  async start() {
    this.homeassistant.start();
    this.bridge.start();
  }

  async stop() {
    this.homeassistant.stop();
    this.bridge.stop();
  }

  subscribeTopic(): string[] {
    return [this.baseTopic + "/cmd/#", this.baseTopic + "/bridge/request/#"];
  }

  onMQTTMessage(data: MQTTMessage) {
    if (data.topic.includes(this.baseTopic + "/cmd/")) {
      this.homeassistant.onMQTTMessage(data);
    } else {
      this.bridge.onMQTTMessage(data);
    }
  }

  publishDiscoveryToMQTT(message: { device: boolean; payload: any }) {
    if (message.device) {
      this.homeassistant.publishDiscoveryToMQTT(message.payload);
    } else {
      this.bridge.publishDiscoveryToMQTT(message.payload);
    }
  }
}
