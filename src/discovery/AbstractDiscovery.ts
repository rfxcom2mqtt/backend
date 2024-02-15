"use strict";

import IRfxcom from "../rfxcom/interface";
import { settingsService } from "../settings";
import { IMqtt } from "../mqtt";
import utils from "../utils/utils";

export default class AbstractDiscovery {
  protected mqtt: IMqtt;
  protected rfxtrx: IRfxcom;
  protected topicWill: string;
  protected topicDevice: string;
  protected baseTopic: string;
  protected discoveryOrigin: { name: string; sw: string; url: string };

  constructor(mqtt: IMqtt, rfxtrx: IRfxcom) {
    this.mqtt = mqtt;
    this.rfxtrx = rfxtrx;
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
      settingsService.get().homeassistant.discovery_topic,
    );
  }
}
