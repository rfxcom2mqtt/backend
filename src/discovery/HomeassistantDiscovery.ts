"use strict";

import IRfxcom from "../rfxcom/interface";
import { Settings, SettingDevice } from "../settings";
import Mqtt from "../mqtt";
import { DeviceEntity, DeviceSensor, DeviceState, DeviceStateStore } from "../models/models";
import { MQTTMessage } from "../models/mqtt";
import StateStore, { DeviceStore } from "../store/state";
import { logger } from "../libs/logger";
import AbstractDiscovery from "./AbstractDiscovery";

export default class HomeassistantDiscovery extends AbstractDiscovery {
  protected state: StateStore;
  protected deviceStore: DeviceStore;
  protected devicesConfig: SettingDevice[];

  constructor(
    mqtt: Mqtt,
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
    const devicePrefix = this.config.discovery_device;
    const id = payload.id;
    const deviceId = payload.subTypeValue + "_" + id.replace("0x", "");
    let deviceTopic = payload.id;
    let deviceName = deviceId;
    let entityId = payload.subTypeValue + "_" + id.replace("0x", "");
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

    this.state.set(
      { id: entityName, type: payload.type, subtype: payload.subtype },
      payload,
      "event",
    );

    if (deviceConf?.friendlyName) {
      deviceName = deviceConf?.friendlyName;
    }

    let deviceJson: DeviceStateStore;
    if (!this.deviceStore.exists(id)) {
      const deviceState = new DeviceState(
        [devicePrefix + "_" + deviceId, devicePrefix + "_" + deviceName],
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
      devicePrefix,
    );
    this.publishDiscoverySwitchToMQTT(
      payload,
      deviceJson,
      entityTopic,
      devicePrefix,
      entityId,
    );

    this.deviceStore.set(id, deviceJson.state);
  }

  publishDiscoverySwitchToMQTT(
    payload: any,
    deviceJson: DeviceStateStore,
    entityTopic: any,
    devicePrefix: any,
    entityId: any,
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
      let entityName = entityId;
      if (this.rfxtrx.isGroup(payload)) {
        state_off = "Group off";
        state_on = "Group On";
        entityName += "_group";
      }

      const json = {
        availability: [{ topic: this.topicWill }],
        device: deviceJson.getInfo(),
        enabled_by_default: true,
        payload_off: state_off,
        payload_on: state_on,
        json_attributes_topic: this.topicDevice + "/" + entityTopic,
        command_topic:
          this.mqtt.topics.base +
          "/cmd/" +
          payload.type +
          "/" +
          payload.subtype +
          "/" +
          entityTopic +
          "/set",
        name: entityName,
        object_id: entityId,
        origin: this.discoveryOrigin,
        state_off: state_off,
        state_on: state_on,
        state_topic: this.topicDevice + "/" + entityTopic,
        unique_id: entityId + "_" + devicePrefix,
        value_template: "{{ value_json.command }}",
      };
      this.publishDiscovery(
        "switch/" + entityTopic + "/config",
        JSON.stringify(json),
      );
      deviceJson.addSwitchId(json.object_id);
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
    devicePrefix: any,
  ) {
    const commonConf = {
      availability: [{ topic: this.topicWill }],
      device: deviceJson.getInfo(),
      json_attributes_topic: this.topicDevice + "/" + entityTopic,
      origin: this.discoveryOrigin,
      state_topic: this.topicDevice + "/" + entityTopic,
    };

    if (payload.rssi !== undefined) {
      const json = {
        enabled_by_default: false,
        entity_category: "diagnostic",
        device_class: "signal_strength",
        icon: "mdi:signal",
        name: deviceName + " Linkquality",
        object_id: deviceTopic + "_linkquality",
        state_class: "measurement",
        unique_id: deviceTopic + "_linkquality_" + devicePrefix,
        unit_of_measurement: "dBm",
        value_template: "{{ value_json.rssi }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/linkquality/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Link quality (signal strength)","rssi","number",json.unit_of_measurement));
    }
    // batteryLevel
    if (payload.batteryLevel !== undefined) {
      const json = {
        device_class: "battery",
        enabled_by_default: true,
        icon: "mdi:battery",
        name: deviceName + " Batterie",
        object_id: deviceTopic + "_battery",
        state_class: "measurement",
        unique_id: deviceTopic + "_battery_" + devicePrefix,
        unit_of_measurement: "%",
        value_template: "{{ value_json.batteryLevel }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/battery/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Remaining battery in %","batteryLevel","number",json.unit_of_measurement));
    }
    // batteryVoltage
    if (payload.batteryVoltage !== undefined) {
      const json = {
        device_class: "voltage",
        enabled_by_default: true,
        icon: "mdi:sine-wave",
        name: deviceName + " Tension",
        object_id: deviceTopic + "_voltage",
        state_class: "measurement",
        unique_id: deviceTopic + "_voltage_" + devicePrefix,
        unit_of_measurement: "mV",
        value_template: "{{ value_json.batteryVoltage }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/voltage/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Tension","voltage","number",json.unit_of_measurement));
    }

    // humidity
    if (payload.humidity !== undefined) {
      const json = {
        device_class: "humidity",
        enabled_by_default: true,
        icon: "mdi:humidity",
        name: deviceName + " Humidity",
        object_id: deviceTopic + "_humidity",
        state_class: "measurement",
        unique_id: deviceTopic + "_humidity_" + devicePrefix,
        unit_of_measurement: "%",
        value_template: "{{ value_json.humidity }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/humidity/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Measured relative humidity","humidity","number",json.unit_of_measurement));
    }

    // temperature
    if (payload.temperature !== undefined) {
      const json = {
        device_class: "temperature",
        enabled_by_default: true,
        icon: "mdi:temperature-celsius",
        name: deviceName + " Temperature",
        object_id: deviceTopic + "_temperature",
        state_class: "measurement",
        unique_id: deviceTopic + "_temperature_" + devicePrefix,
        unit_of_measurement: "°C",
        value_template: "{{ value_json.temperature }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/temperature/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Measured temperature value","temperature","number",json.unit_of_measurement));
    }

    // co2
    if (payload.co2 !== undefined) {
      const json = {
        device_class: "carbon_dioxide",
        enabled_by_default: true,
        name: deviceName + " Co2",
        object_id: deviceTopic + "_co2",
        state_class: "measurement",
        unique_id: deviceTopic + "_co2_" + devicePrefix,
        unit_of_measurement: "°C",
        value_template: "{{ value_json.co2 }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/co2/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Co2","co2","number",json.unit_of_measurement));
    }

    // power
    if (payload.power !== undefined) {
      const json = {
        device_class: "power",
        entity_category: "diagnostic",
        enabled_by_default: true,
        name: deviceName + " Power",
        object_id: deviceTopic + "_power",
        state_class: "measurement",
        unique_id: deviceTopic + "_power_" + devicePrefix,
        value_template: "{{ value_json.power }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/power/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Power","power","number",""));
    }

    // energy
    if (payload.energy !== undefined) {
      const json = {
        device_class: "energy",
        entity_category: "diagnostic",
        enabled_by_default: true,
        name: deviceName + " Energy",
        object_id: deviceTopic + "_energy",
        state_class: "total_increasing",
        unique_id: deviceTopic + "_energy_" + devicePrefix,
        value_template: "{{ value_json.energy }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/energy/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Energy increment","energy","number",""));
    }

    // barometer
    if (payload.barometer !== undefined) {
      const json = {
        device_class: "pressure",
        entity_category: "diagnostic",
        enabled_by_default: true,
        name: deviceName + " Barometer",
        object_id: deviceTopic + "_barometer",
        state_class: "measurement",
        unit_of_measurement: "hPa",
        unique_id: deviceTopic + "_barometer_" + devicePrefix,
        value_template: "{{ value_json.barometer }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/barometer/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"The measured atmospheric pressure","barometer","number",json.unit_of_measurement));
    }

    // count
    if (payload.count !== undefined) {
      const json = {
        entity_category: "diagnostic",
        enabled_by_default: true,
        name: deviceName + " Count",
        object_id: deviceTopic + "_count",
        state_class: "measurement",
        unit_of_measurement: "",
        unique_id: deviceTopic + "_count_" + devicePrefix,
        value_template: "{{ value_json.count }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/count/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Counter","count","number",json.unit_of_measurement));
    }

    // weight
    if (payload.weight !== undefined) {
      const json = {
        device_class: "weight",
        enabled_by_default: true,
        icon: "mdi:weight",
        name: deviceName + " Weight",
        object_id: deviceTopic + "_weight",
        state_class: "measurement",
        unit_of_measurement: "Kg",
        unique_id: deviceTopic + "_weight_" + devicePrefix,
        value_template: "{{ value_json.weight }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/weight/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"Weight","weight","number",json.unit_of_measurement));
    }

    // uv
    if (payload.uv !== undefined) {
      const json = {
        enabled_by_default: true,
        icon: "mdi:sunglasses",
        name: deviceName + " UV",
        object_id: deviceTopic + "_uv",
        state_class: "measurement",
        unit_of_measurement: "UV index",
        unique_id: deviceTopic + "_uv_" + devicePrefix,
        value_template: "{{ value_json.uv }}",
        ...commonConf,
      };
      this.publishDiscovery(
        "sensor/" + deviceTopic + "/uv/config",
        JSON.stringify(json),
      );
      deviceJson.addSensor(new DeviceSensor(json.object_id,json.name,"UV","uv","number",json.unit_of_measurement));
    }
  }
}
