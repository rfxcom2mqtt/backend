"use strict";

import IRfxcom from "../rfxcom/interface";
import { SettingDevice, settingsService } from "../settings";
import { IMqtt } from "../mqtt";
import {
  DeviceSwitch,
  DeviceBinarySensor,
  DeviceSelect,
  DeviceCover,
  DeviceSensor,
  DeviceState,
  DeviceStateStore,
} from "../models/models";
import { MQTTMessage } from "../models/mqtt";
import StateStore, { DeviceStore } from "../store/state";
import { logger } from "../utils/logger";
import AbstractDiscovery from "./AbstractDiscovery";
import { lookup } from "./Homeassistant";

export default class HomeassistantDiscovery extends AbstractDiscovery {
  protected state: StateStore;
  protected deviceStore: DeviceStore;
  protected devicesConfig: SettingDevice[];

  constructor(
    mqtt: IMqtt,
    rfxtrx: IRfxcom,
    state: StateStore,
    deviceStore: DeviceStore,
  ) {
    super(mqtt, rfxtrx);
    this.devicesConfig = settingsService.get().devices;
    this.state = state;
    this.deviceStore = deviceStore;
  }

  async start() {
    super.start();
    this.state.start();
  }

  async stop() {
    super.stop();
    this.state.stop();
  }

  onMQTTMessage(data: MQTTMessage) {
    const value = data.message.toString("utf8");
    logger.info(`Mqtt cmd from discovery :${data.topic} ${value}`);
    const dn = data.topic.split("/");
    const deviceType = dn[2];
    const id = dn[4];
    const subTypeValue = dn[3];
    let entityName = id;
    let entityTopic = id;
    let unitCode = 1;

    //TODO check data

    // Used for units and forms part of the device id
    if (dn[5] !== undefined && dn[5] !== "set" && dn[5].length > 0) {
      unitCode = parseInt(dn[5]);
      entityTopic += "/" + unitCode;
      entityName += "_" + unitCode;
    }

    logger.debug(`update ${deviceType}.${entityName} with value ${value}`);

    // get from save state
    const entityState = this.state.getByDeviceIdAndUnitCode(id, unitCode);
    logger.info("entity  " + JSON.stringify(entityState));
    entityState.type = deviceType;
    this.updateEntityStateFromValue(entityState, value);
    this.rfxtrx.sendCommand(
      deviceType,
      subTypeValue,
      entityState.rfxFunction,
      entityTopic,
    );
    this.mqtt.publish(
      this.mqtt.topics.devices + "/" + entityTopic,
      JSON.stringify(entityState),
      (error: any) => {},
      { retain: true, qos: 1 },
    );
    this.state.set(entityState.entityId, entityState);
  }

  updateEntityStateFromValue(entityState: any, value: string) {
    if (
      entityState.type === "lighting1" ||
      entityState.type === "lighting2" ||
      entityState.type === "lighting3" ||
      entityState.type === "lighting5" ||
      entityState.type === "lighting6"
    ) {
      entityState.command = value;
      const cmd = value.toLowerCase().split(" ");
      let command = cmd[0];
      if (cmd[0] === "group") {
        command = cmd[1];
      }
      if (command === "on") {
        entityState.commandNumber = cmd[0] === "group" ? 4 : 1; //WORK only for lithing2
        entityState.rfxFunction = "switchOn";
      } else if (command === "off") {
        entityState.commandNumber = cmd[0] === "group" ? 3 : 0; //WORK only for lithing2
        entityState.rfxFunction = "switchOff";
      } else {
        if (cmd[0] === "level") {
          entityState.rfxFunction = "setLevel";
          entityState.rfxOpt = cmd[1];
        }
      }
    } else if (entityState.deviceType === "lighting4") {
      entityState.rfxFunction = "sendData";
      entityState.command = value;
    } else if (entityState.deviceType === "chime1") {
      entityState.rfxFunction = "chime";
      entityState.command = value;
    } else {
      logger.error("device type (" + entityState.type + ") not supported");
    }

    //TODO get command for other type
  }

  publishDiscoveryToMQTT(payload: any) {
    logger.info("publish to discovery : " + payload.id);
    const bridgeName = settingsService.get().homeassistant.discovery_device;
    const deviceId = payload.subTypeValue + "_" + payload.id.replace("0x", "");
    const deviceName = deviceId;

    let deviceJson: DeviceStateStore;
    if (!this.deviceStore.exists(payload.id)) {
      const deviceState = new DeviceState(payload.id, deviceName);
      deviceState.subtype = payload.subtype;
      deviceState.subTypeValue = payload.subTypeValue;
      deviceState.type = payload.type;
      deviceJson = new DeviceStateStore(deviceState);
    } else {
      const deviceState = this.deviceStore.get(payload.id);
      deviceState.name = deviceName;
      deviceJson = new DeviceStateStore(deviceState);
    }
    deviceJson.overrideDeviceInfo();

    const entityId = deviceJson.getEntityId(payload);
    this.state.set(entityId, payload, "event");
    deviceJson.addEntity(entityId);

    this.loadDiscoverySensorInfo(payload, deviceJson);
    this.loadDiscoveryBinarySensorInfo(payload, deviceJson);
    this.loadDiscoverySelectInfo(payload, deviceJson);
    this.loadDiscoveryCoverInfo(payload, deviceJson);
    this.loadDiscoverySwitchInfo(payload, deviceJson);

    this.deviceStore.set(payload.id, deviceJson.state);
    this.publishDiscoveryDeviceToMqtt(deviceJson, bridgeName);
  }

  publishDiscoveryDeviceToMqtt(
    deviceJson: DeviceStateStore,
    bridgeName: string,
  ) {
    deviceJson.overrideDeviceInfo();

    const commonConf = {
      availability: [{ topic: this.topicWill }],
      device: deviceJson.getInfo(),
      origin: this.discoveryOrigin,
      json_attributes_topic: deviceJson.getStateTopic(this.topicDevice),
      state_topic: deviceJson.getStateTopic(this.topicDevice),
    };

    const sensors = deviceJson.getSensors();
    for (const index in sensors) {
      const sensor = sensors[index];
      const json = {
        name: deviceJson.state.name + " " + sensor.name,
        object_id: sensor.id,
        unique_id: sensor.id + "_" + bridgeName,
        value_template: "{{ value_json." + sensor.property + " }}",
        ...commonConf,
        ...lookup[sensor.type],
      };
      this.publishDiscovery(
        "sensor/" + deviceJson.getId() + "/" + sensor.type + "/config",
        JSON.stringify(json),
      );
    }

    const binarysensors = deviceJson.getBinarySensors();
    for (const index in binarysensors) {
      const binarysensor = binarysensors[index];
      const json = {
        name: deviceJson.state.name + " " + binarysensor.name,
        object_id: binarysensor.id,
        unique_id: binarysensor.id + "_" + bridgeName,
        payload_off: binarysensor.value_off,
        payload_on: binarysensor.value_on,
        value_template: "{{ value_json." + binarysensor.property + " }}",
        ...commonConf,
        ...lookup[binarysensor.type],
      };
      this.publishDiscovery(
        "binary_sensor/" + deviceJson.getId() + "/config",
        JSON.stringify(json),
      );
    }

    const covers = deviceJson.getCovers();
    for (const index in covers) {
      const cover = covers[index];
      const json = {
        name: deviceJson.state.name + " " + cover.name,
        object_id: cover.id,
        unique_id: cover.id + "_" + bridgeName,
        value_template: "{{ value_json." + cover.property + " }}",
        position_template: "{{ value_json." + cover.positionProperty + " }}",
        position_topic: deviceJson.getStateTopic(this.topicDevice),
        state_closing: "DOWN",
        state_opening: "UP",
        state_stopped: "STOP",
        set_position_template: '{ "position": {{ position }} }',
        set_position_topic: deviceJson.getCommandTopic(
          this.mqtt.topics.base + "/cmd/",
          cover.id,
        ),
        ...commonConf,
        ...lookup[cover.type],
      };
      this.publishDiscovery(
        "cover/" + deviceJson.getId() + "/config",
        JSON.stringify(json),
      );
    }

    const selects = deviceJson.getSelects();
    for (const index in selects) {
      const select = selects[index];
      const json = {
        name: deviceJson.state.name + " " + select.name,
        object_id: select.id,
        unique_id: select.id + "_" + bridgeName,
        options: select.options,
        value_template: "{{ value_json." + select.property + " }}",
        ...commonConf,
        ...lookup[select.type],
      };
      this.publishDiscovery(
        "select/" + deviceJson.getId() + "/config",
        JSON.stringify(json),
      );
    }

    const switchs = deviceJson.getSwitchs();
    for (const index in switchs) {
      const switchInfo = switchs[index];
      let entityTopic = deviceJson.getId();
      if (switchInfo.unit !== undefined && !switchInfo.group) {
        entityTopic += "/" + switchInfo.unit;
      }
      const json = {
        availability: [{ topic: this.topicWill }],
        device: deviceJson.getInfo(),
        enabled_by_default: true,
        payload_off: switchInfo.value_off,
        payload_on: switchInfo.value_on,
        json_attributes_topic: deviceJson.getStateTopic(
          this.topicDevice,
          switchInfo.id,
        ),
        command_topic: deviceJson.getCommandTopic(
          this.mqtt.topics.base + "/cmd/",
          switchInfo.id,
        ),
        name: switchInfo.name,
        object_id: switchInfo.id,
        origin: this.discoveryOrigin,
        state_off: switchInfo.value_off,
        state_on: switchInfo.value_on,
        state_topic: deviceJson.getStateTopic(this.topicDevice, switchInfo.id),
        unique_id: switchInfo.id + "_" + bridgeName,
        value_template: "{{ value_json." + switchInfo.property + " }}",
      };
      this.publishDiscovery(
        "switch/" + entityTopic + "/config",
        JSON.stringify(json),
      );
    }
  }

  loadDiscoverySwitchInfo(payload: any, deviceJson: DeviceStateStore) {
    let entityId = deviceJson.getEntityId(payload);
    let entityName = payload.id;
    if (
      payload.type === "lighting1" ||
      payload.type === "lighting2" ||
      payload.type === "lighting3" ||
      payload.type === "lighting5" ||
      payload.type === "lighting6"
    ) {
      let state_off = "Off";
      let state_on = "On";

      let originalName = deviceJson.state.originalName;
      if (payload.unitCode !== undefined && !payload.group) {
        originalName += " " + payload.unitCode;
        entityName += " " + payload.unitCode;
      }

      if (payload.group) {
        state_off = "Group off";
        state_on = "Group On";
        entityId += "_group";
      }

      const switchInfo = new DeviceSwitch(
        entityId,
        entityName,
        originalName,
        payload.unitCode,
        state_on,
        state_off,
      );
      switchInfo.group = payload.group;
      deviceJson.addSwitch(switchInfo);
    }

    //"activlink", "asyncconfig", "asyncdata", "blinds1", "blinds2", "camera1", "chime1", "curtain1", "edisio",
    //"fan", "funkbus", "homeConfort", "hunterFan", "lighting4",
    // "radiator1", "remote", "rfy", "security1", "thermostat1", "thermostat2", "thermostat3", "thermostat4", "thermostat5"
  }

  loadDiscoveryBinarySensorInfo(payload: any, deviceJson: DeviceStateStore) {
    const entityId = deviceJson.getEntityId(payload);
    const entityName = payload.id;
    if (payload.type === "security1") {
      const binarySensorInfo = new DeviceBinarySensor(
        entityId,
        entityName,
        entityName,
        "property",
        "todo",
      );
      deviceJson.addBinarySensor(binarySensorInfo);
    }
  }

  loadDiscoverySelectInfo(payload: any, deviceJson: DeviceStateStore) {
    const entityId = deviceJson.getEntityId(payload);
    const entityName = payload.id;
    if (payload.type === "todo") {
      const selectInfo = new DeviceSelect(
        entityId,
        entityName,
        entityName,
        "property",
        "todo",
      );
      deviceJson.addSelect(selectInfo);
    }
  }

  loadDiscoveryCoverInfo(payload: any, deviceJson: DeviceStateStore) {
    const entityId = deviceJson.getEntityId(payload);
    const entityName = payload.id;
    if (payload.type === "todo") {
      const coverInfo = new DeviceCover(
        entityId,
        entityName,
        entityName,
        "property",
        "todo",
      );
      deviceJson.addCover(coverInfo);
    }
  }

  loadDiscoverySensorInfo(payload: any, deviceJson: DeviceStateStore) {
    if (payload.rssi !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_linkquality",
          "Linkquality",
          "Link quality (signal strength)",
          "rssi",
          "linkquality",
        ),
      );
    }
    // batteryLevel
    if (payload.batteryLevel !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_battery",
          "Battery",
          "Remaining battery in %",
          "batteryLevel",
          "battery",
        ),
      );
    }
    // batteryVoltage
    if (payload.batteryVoltage !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_voltage",
          "Tension",
          "Tension",
          "batteryVoltage",
          "battery_voltage",
        ),
      );
    }

    // humidity
    if (payload.humidity !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_humidity",
          "Humidity",
          "Measured relative humidity",
          "humidity",
          "humidity",
        ),
      );
    }

    // temperature
    if (payload.temperature !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_temperature",
          "Temperature",
          "Measured temperature value",
          "temperature",
          "temperature",
        ),
      );
    }

    // co2
    if (payload.co2 !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_co2",
          "Co2",
          "Co2",
          "co2",
          "co2",
        ),
      );
    }

    // power
    if (payload.power !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_power",
          "Power",
          "Power",
          "power",
          "power",
        ),
      );
    }

    // energy
    if (payload.energy !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_energy",
          "Energy",
          "Energy increment",
          "energy",
          "energy",
        ),
      );
    }

    // barometer
    if (payload.barometer !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_barometer",
          "Barometer",
          "The measured atmospheric pressure",
          "barometer",
          "pressure",
        ),
      );
    }

    // count
    if (payload.count !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_count",
          "Count",
          "Counter",
          "count",
          "count",
        ),
      );
    }

    // weight
    if (payload.weight !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_weight",
          "Weight",
          "Weight",
          "weight",
          "weight",
        ),
      );
    }

    // uv
    if (payload.uv !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceJson.getId() + "_uv",
          "UV",
          "UV",
          "uv",
          "number",
        ),
      );
    }
  }
}
