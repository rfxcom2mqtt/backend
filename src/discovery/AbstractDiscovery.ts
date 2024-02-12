"use strict";

import IRfxcom from "../rfxcom/interface";
import { Settings, SettingHass } from "../settings";
import Mqtt from "../mqtt";
import utils from "../utils/utils";

export default class AbstractDiscovery {
  protected mqtt: Mqtt;
  protected rfxtrx: IRfxcom;
  protected config: SettingHass;
  protected topicWill: string;
  protected topicDevice: string;
  protected baseTopic: string;
  protected discoveryOrigin: { name: string; sw: string; url: string };

  constructor(mqtt: Mqtt, rfxtrx: IRfxcom, config: Settings) {
    this.mqtt = mqtt;
    this.rfxtrx = rfxtrx;
    this.config = config.homeassistant;
    this.topicWill = mqtt.topics.base + "/" + mqtt.topics.will;
    this.topicDevice = mqtt.topics.base + "/" + mqtt.topics.devices;
    this.baseTopic = mqtt.topics.base;
    this.discoveryOrigin = {
      name: "Rfxcom2MQTT",
      sw: "",
      url: "https://rfxcom2mqtt.github.io/rfxcom2mqtt/",
    };
  }

  async start() {
    this.discoveryOrigin.sw = utils.getRfxcom2MQTTVersion();
  }

  async stop() {}

  publishDiscovery(topic: any, payload: any) {
    this.mqtt.publish(
      topic,
      payload,
      (error: any) => {},
      { retain: true, qos: 1 },
      this.config.discovery_topic,
    );
  }
}
