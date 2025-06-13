"use strict";

import { DeviceStateStore } from "../../core/models";
import { MQTTMessage } from "../../core/models/mqtt";
import { IMqtt, MqttEventListener } from "../../core/services/mqtt.service";
import IRfxcom from "../../core/services/rfxcom.service";
import StateStore, { DeviceStore } from "../../core/store/state";
import BridgeDiscovery from "./BridgeDiscovery";
import HomeassistantDiscovery from "./HomeassistantDiscovery";

export default class Discovery implements MqttEventListener {
  protected baseTopic: string;
  homeassistant: HomeassistantDiscovery;
  bridge: BridgeDiscovery;
  
  // Getter for testing purposes
  getBaseTopic(): string {
    return this.baseTopic;
  }

  constructor(
    mqtt: IMqtt,
    rfxtrx: IRfxcom,
    state: StateStore,
    device: DeviceStore,
  ) {
    this.baseTopic = mqtt.topics.base;
    this.homeassistant = new HomeassistantDiscovery(
      mqtt,
      rfxtrx,
      state,
      device,
    );
    this.bridge = new BridgeDiscovery(mqtt, rfxtrx);
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

  publishDiscoveryDeviceToMqtt(
    deviceJson: DeviceStateStore,
    bridgeName: string,
  ) {
    this.homeassistant.publishDiscoveryDeviceToMqtt(deviceJson, bridgeName);
  }
}
