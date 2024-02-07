"use strict";

import IRfxcom from "../rfxcom/interface";
import { Settings, settingsService } from "../settings";
import Mqtt from "../mqtt";
import { DeviceBridge, BridgeInfo } from "../models/models";
import { MQTTMessage } from "../models/mqtt";
import { loggerFactory, logger } from "../libs/logger";
import AbstractDiscovery from "./AbstractDiscovery";

export default class BridgeDiscovery extends AbstractDiscovery {
  constructor(mqtt: Mqtt, rfxtrx: IRfxcom, config: Settings) {
    super(mqtt, rfxtrx, config);
  }

  async start() {
    super.start();
  }

  async stop() {
    super.stop();
  }

  onMQTTMessage(data: MQTTMessage) {
    if (data.topic === this.baseTopic + "/bridge/request/log_level") {
      const payload = JSON.parse(data.message);
      loggerFactory.setLevel(payload.log_level);
      logger.info("update log level to : " + payload.log_level);
      settingsService.set(["loglevel"], payload.log_level);
    }
  }

  publishDiscoveryToMQTT(bridgeInfo: BridgeInfo) {
    const deviceJson = new DeviceBridge(
      ["rfxcom2mqtt_bridge"],
      `${bridgeInfo.coordinator.hardwareVersion} ${bridgeInfo.coordinator.firmwareVersion}`,
      this.discoveryOrigin.sw,
    );
    const json = {
      availability: [{ topic: this.topicWill }],
      availability_mode: "all",
      device: deviceJson,
      entity_category: "diagnostic",
      icon: "mdi:chip",
      name: "Coordinator Version",
      object_id: "bridge_rfxcom2mqtt_coordinator_version",
      origin: this.discoveryOrigin,
      state_topic: this.mqtt.topics.base + "/" + this.mqtt.topics.info,
      unique_id: "bridge_rfxcom2mqtt_coordinator_version",
      value_template: "{{ value_json.coordinator.firmwareVersion }}",
    };
    this.publishDiscovery(
      "sensor/bridge_rfxcom2mqtt_coordinator_version/version/config",
      JSON.stringify(json),
    );

    const jsonVersion = {
      availability: [{ topic: this.topicWill }],
      availability_mode: "all",
      device: deviceJson,
      entity_category: "diagnostic",
      name: "Version",
      object_id: "bridge_rfxcom2mqtt_version",
      origin: this.discoveryOrigin,
      state_topic: this.mqtt.topics.base + "/" + this.mqtt.topics.info,
      unique_id: "bridge_rfxcom2mqtt_version",
      value_template: "{{ value_json.version }}",
    };
    this.publishDiscovery(
      "sensor/bridge_rfxcom2mqtt_version/version/config",
      JSON.stringify(jsonVersion),
    );

    const jsonState = {
      availability: [{ topic: this.topicWill }],
      availability_mode: "all",
      device: deviceJson,
      device_class: "connectivity",
      entity_category: "diagnostic",
      name: "Connection State",
      payload_on: "online",
      payload_off: "offline",
      object_id: "bridge_rfxcom2mqtt_connection_state",
      origin: this.discoveryOrigin,
      state_topic: this.mqtt.topics.base + "/" + this.mqtt.topics.will,
      unique_id: "bridge_rfxcom2mqtt_connection_state",
      value_template: "{{ value }}",
    };
    this.publishDiscovery(
      "binary_sensor/bridge_rfxcom2mqtt_version/connection_state/config",
      JSON.stringify(jsonState),
    );

    const jsonLoggerLevel = {
      availability: [{ topic: this.topicWill }],
      availability_mode: "all",
      device: deviceJson,
      entity_category: "config",
      name: "Log level",
      object_id: "bridge_rfxcom2mqtt_log_level",
      origin: this.discoveryOrigin,
      state_topic: this.mqtt.topics.base + "/" + this.mqtt.topics.info,
      command_topic: this.mqtt.topics.base + "/bridge/request/log_level",
      command_template: '{"log_level": "{{ value }}" }',
      options: ["info", "warn", "error", "debug"],
      unique_id: "bridge_rfxcom2mqtt_log_level",
      value_template: "{{ value_json.logLevel | lower }}",
    };
    this.publishDiscovery(
      "select/bridge_rfxcom2mqtt_log_level/log_level/config",
      JSON.stringify(jsonLoggerLevel),
    );
  }
}
