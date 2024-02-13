"use strict";

import IRfxcom from "../rfxcom/interface";
import { Settings, SettingDevice } from "../settings";
import { IMqtt } from "../mqtt";
import {
  DeviceSwitch,
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
    config: Settings,
    state: StateStore,
    deviceStore: DeviceStore,
  ) {
    super(mqtt, rfxtrx, config);
    this.devicesConfig = config.rfxcom.devices;
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
    const entityState = this.state.get({
      id: entityName,
      type: deviceType,
      subtype: data.message.subtype,
    });
    entityState.deviceType = deviceType;
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
  }

  updateEntityStateFromValue(entityState: any, value: string) {
    if (
      entityState.deviceType === "lighting1" ||
      entityState.deviceType === "lighting2" ||
      entityState.deviceType === "lighting3" ||
      entityState.deviceType === "lighting5" ||
      entityState.deviceType === "lighting6"
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
      logger.error(
        "device type (" + entityState.deviceType + ") not supported",
      );
    }

    //TODO get command for other deviceType
  }

  publishDiscoveryToMQTT(payload: any) {
    const bridgeName = this.config.discovery_device;
    const id = payload.id;
    const deviceId = payload.subTypeValue + "_" + id.replace("0x", "");
    let deviceTopic = payload.id;
    let deviceName = deviceId;
    let entityId = deviceId;
    let entityName = payload.id;
    let entityTopic = payload.id;

    const deviceConf = this.devicesConfig.find((dev: any) => dev.id === id);

    if (deviceConf?.name !== undefined) {
      entityTopic = deviceConf.name;
      deviceTopic = deviceConf.name;
    }

    if (payload.unitCode !== undefined && !this.rfxtrx.isGroup(payload)) {
      entityId += "_" + payload.unitCode;
      entityTopic += "/" + payload.unitCode;
      entityName += "_" + payload.unitCode;
      if (deviceConf?.units) {
        deviceConf?.units.forEach((unit) => {
          if (parseInt(unit.unitCode) === parseInt(payload.unitCode)) {
            if (unit.name!) {
              entityTopic = unit.name;
            }
          }
        });
      }
    }

    this.state.set(entityName, payload, "event");

    if (deviceConf?.friendlyName) {
      deviceName = deviceConf?.friendlyName;
    }

    let deviceJson: DeviceStateStore;
    if (!this.deviceStore.exists(id)) {
      const deviceState = new DeviceState(
        [bridgeName + "_" + deviceId, bridgeName + "_" + deviceName],
        deviceName,
      );
      deviceState.subtype = payload.subtype;
      deviceState.subTypeValue = payload.subTypeValue;
      deviceState.type = payload.type;
      deviceState.id = id;
      deviceJson = new DeviceStateStore(deviceState);
    } else {
      deviceJson = new DeviceStateStore(this.deviceStore.get(id));
    }
    deviceJson.addEntity(entityId);

    this.publishDiscoverySensorToMQTT(
      payload,
      deviceJson,
      deviceName,
      deviceTopic,
      entityTopic,
      bridgeName,
    );
    this.publishDiscoverySwitchToMQTT(
      payload,
      deviceJson,
      entityTopic,
      bridgeName,
      entityId,
      entityName,
    );

    this.deviceStore.set(id, deviceJson.state);
  }

  publishDiscoverySwitchToMQTT(
    payload: any,
    deviceJson: DeviceStateStore,
    entityTopic: string,
    bridgeName: string,
    entityId: string,
    entityName: string,
  ) {
    if (
      payload.type === "lighting1" ||
      payload.type === "lighting2" ||
      payload.type === "lighting3" ||
      payload.type === "lighting5" ||
      payload.type === "lighting6"
    ) {
      let state_off = "Off";
      let state_on = "On";
      if (this.rfxtrx.isGroup(payload)) {
        state_off = "Group off";
        state_on = "Group On";
        entityName += "_group";
      }

      const switchInfo = new DeviceSwitch(
        entityName,
        entityId,
        payload.unitCode,
        state_on,
        state_off,
      );
      deviceJson.addSwitch(switchInfo);

      const json = {
        availability: [{ topic: this.topicWill }],
        device: deviceJson.getInfo(),
        enabled_by_default: true,
        payload_off: switchInfo.value_off,
        payload_on: switchInfo.value_off,
        json_attributes_topic: this.topicDevice + "/" + entityTopic,
        command_topic: deviceJson.getCommandTopic(
          this.mqtt.topics.base + "/cmd/",
          entityName,
        ),
        name: entityName,
        object_id: entityId,
        origin: this.discoveryOrigin,
        state_off: switchInfo.value_off,
        state_on: switchInfo.value_on,
        state_topic: this.topicDevice + "/" + entityTopic,
        unique_id: entityId + "_" + bridgeName,
        value_template: "{{ value_json." + switchInfo.property + " }}",
      };
      this.publishDiscovery(
        "switch/" + entityTopic + "/config",
        JSON.stringify(json),
      );
    }

    //"activlink", "asyncconfig", "asyncdata", "blinds1", "blinds2", "camera1", "chime1", "curtain1", "edisio",
    //"fan", "funkbus", "homeConfort", "hunterFan", "lighting4",
    // "radiator1", "remote", "rfy", "security1", "thermostat1", "thermostat2", "thermostat3", "thermostat4", "thermostat5"
  }

  publishDiscoverySensorToMQTT(
    payload: any,
    deviceJson: DeviceStateStore,
    deviceName: any,
    deviceTopic: any,
    entityTopic: any,
    bridgeName: any,
  ) {
    const commonConf = {
      availability: [{ topic: this.topicWill }],
      device: deviceJson.getInfo(),
      json_attributes_topic: this.topicDevice + "/" + entityTopic,
      origin: this.discoveryOrigin,
      state_topic: this.topicDevice + "/" + entityTopic,
    };

    if (payload.rssi !== undefined) {
      deviceJson.addSensor(
        new DeviceSensor(
          deviceTopic + "_linkquality",
          deviceName + " Linkquality",
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
          deviceTopic + "_battery",
          deviceName + " Battery",
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
          deviceTopic + "_voltage",
          deviceName + " Tension",
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
          deviceTopic + "_humidity",
          deviceName + " Humidity",
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
          deviceTopic + "_temperature",
          deviceName + " Temperature",
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
          deviceTopic + "_co2",
          deviceName + " Co2",
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
          deviceTopic + "_power",
          deviceName + " Power",
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
          deviceTopic + "_energy",
          deviceName + " Energy",
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
          deviceTopic + "_barometer",
          deviceName + " Barometer",
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
          deviceTopic + "_count",
          deviceName + " Count",
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
          deviceTopic + "_weight",
          deviceName + " Weight",
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
          deviceTopic + "_uv",
          deviceName + " UV",
          "UV",
          "uv",
          "number",
        ),
      );
    }

    const sensors = deviceJson.getSensors();
    for (const index in sensors) {
      const sensor = sensors[index];
      const json = {
        name: sensor.label,
        object_id: sensor.id,
        unique_id: sensor.id + "_" + bridgeName,
        value_template: "{{ value_json." + sensor.property + " }}",
        ...commonConf,
        ...lookup[sensor.type],
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/" + sensor.type + "/config",
        JSON.stringify(json),
      );
    }
  }
}
