import { RfxcomInfo } from "./rfxcom";
import { settingsService } from "../settings";

export class Action {
  constructor(
    public type: string = "",
    public action: string = "",
    public deviceId: string = "",
    public entityId: string = "",
  ) {}
}

export interface KeyValue {
  [s: string]: any;
}

export class DeviceEntity {
  public manufacturer: string = "Rfxcom";
  public via_device: string = "rfxcom2mqtt_bridge";
  public identifiers: string[] = [];
  public id?: string;
  public name: string = "";
  public originalName?: string;

  constructor(id?: string, name?: string) {
    this.identifiers = ["rfxcom2mqtt_" + id, "rfxcom2mqtt_" + name];
    this.id = id;
    this.name = name ? name : "";
    this.originalName = name;
  }
}

export class DeviceCover {
  constructor(
    public id: string = "",
    public name: string = "",
    public description: string = "",
    public property: string = "",
    public positionProperty: string = "",
    public type: string = "",
  ) {}
}

export class DeviceBinarySensor {
  constructor(
    public id: string = "",
    public name: string = "",
    public description: string = "",
    public property: string = "",
    public type: string = "",
    public value_on: boolean = true,
    public value_off: boolean = false,
  ) {}
}

export class DeviceSelect {
  constructor(
    public id: string = "",
    public name: string = "",
    public description: string = "",
    public property: string = "",
    public type: string = "",
    public options: string[] = [],
  ) {}
}

export class DeviceSensor {
  constructor(
    public id: string = "",
    public name: string = "",
    public description: string = "",
    public property: string = "",
    public type: string = "",
  ) {}
}

export class DeviceSwitch {
  constructor(
    public id: string = "",
    public name: string = "",
    public originalName: string = "",
    public unit: number = 0,
    public value_on: string = "On",
    public value_off: string = "Off",
    public description: string = "On/off state of the switch",
    public property: string = "command",
    public type: string = "binary",
    public group: boolean = false,
  ) {}
}

export class DeviceState extends DeviceEntity {
  public type: string = "";
  public subtype: number = 0;
  public subTypeValue: string = "";
  entities: string[] = [];
  sensors: { [s: string]: DeviceSensor } = {};
  binarysensors: { [s: string]: DeviceBinarySensor } = {};
  selects: { [s: string]: DeviceSelect } = {};
  covers: { [s: string]: DeviceCover } = {};
  switchs: { [s: string]: DeviceSwitch } = {};

  constructor(id: string, name: string) {
    super(id, name);
  }
}

export class DeviceStateStore {
  public state: DeviceState;

  constructor(state: DeviceState) {
    this.state = state;
  }

  getInfo(): any {
    const info = new DeviceEntity();
    info.name = this.state.name;
    //info.id = this.state.id;
    if (this.state.name !== this.state.originalName) {
      info.identifiers = [
        "rfxcom2mqtt_" + this.state.id,
        "rfxcom2mqtt_" + this.state.originalName,
        "rfxcom2mqtt_" + info.name,
      ];
    } else {
      info.identifiers = [
        "rfxcom2mqtt_" + this.state.id,
        "rfxcom2mqtt_" + this.state.originalName,
      ];
    }
    delete info["id"];
    return info;
  }

  getId() {
    return this.state.id;
  }

  getEntityId(payload: any): any {
    let entityId = payload.subTypeValue + "_" + payload.id.replace("0x", "");
    if (payload.unitCode !== undefined && !payload.group) {
      entityId += "_" + payload.unitCode;
    }

    return entityId;
  }

  getCommandTopic(baseTopic: string, entityId: string) {
    let topicSufix = "";
    if (this.state.switchs[entityId].unit !== undefined) {
      topicSufix = "/" + this.state.switchs[entityId].unit;
    }
    return (
      baseTopic +
      this.state.type +
      "/" +
      this.state.subtype +
      "/" +
      this.state.id +
      topicSufix
    );
  }

  getStateTopic(baseTopic: string, switchId?: string) {
    let topicSufix = "";
    if (
      switchId !== undefined &&
      this.state.switchs[switchId].unit !== undefined
    ) {
      topicSufix = "/" + this.state.switchs[switchId].unit;
    }
    return baseTopic + "/" + this.state.id + topicSufix;
  }

  addEntity(entityId: string) {
    if (!this.state.entities.includes(entityId)) {
      this.state.entities.push(entityId);
    }
  }

  addSensorId(sensorId: string) {
    this.addSensor(new DeviceSensor(sensorId, sensorId));
  }

  addSensor(sensor: DeviceSensor): DeviceSensor {
    if (this.state.sensors[sensor.id] === undefined) {
      this.state.sensors[sensor.id] = sensor;
    }
    return sensor;
  }

  getSensors(): { [s: string]: DeviceSensor } {
    return this.state.sensors;
  }

  addSwitchId(switchId: string) {
    this.addSwitch(new DeviceSwitch(switchId, switchId));
  }

  addSwitch(dswitch: DeviceSwitch) {
    if (this.state.switchs[dswitch.id] === undefined) {
      this.state.switchs[dswitch.id] = dswitch;
    }
  }

  getSwitchs(): { [s: string]: DeviceSwitch } {
    return this.state.switchs;
  }

  addBinarySensorId(sensorId: string) {
    this.addBinarySensor(new DeviceBinarySensor(sensorId, sensorId));
  }

  addBinarySensor(sensor: DeviceBinarySensor): DeviceBinarySensor {
    if (this.state.binarysensors[sensor.id] === undefined) {
      this.state.binarysensors[sensor.id] = sensor;
    }
    return sensor;
  }

  getBinarySensors(): { [s: string]: DeviceBinarySensor } {
    return this.state.binarysensors;
  }

  addSelelectId(sensorId: string) {
    this.addSelect(new DeviceSelect(sensorId, sensorId));
  }

  addSelect(sensor: DeviceSelect): DeviceSelect {
    if (this.state.selects[sensor.id] === undefined) {
      this.state.selects[sensor.id] = sensor;
    }
    return sensor;
  }

  getSelects(): { [s: string]: DeviceSelect } {
    return this.state.selects;
  }

  addCoverId(sensorId: string) {
    this.addCover(new DeviceCover(sensorId, sensorId));
  }

  addCover(sensor: DeviceCover): DeviceCover {
    if (this.state.covers[sensor.id] === undefined) {
      this.state.covers[sensor.id] = sensor;
    }
    return sensor;
  }

  getCovers(): { [s: string]: DeviceCover } {
    return this.state.covers;
  }

  overrideDeviceInfo() {
    const deviceConf = settingsService
      .get()
      .devices.find((dev: any) => dev.id === this.state.id);

    if (deviceConf?.name !== undefined) {
      this.state.name = deviceConf.name;
    }

    for (const index in this.state.switchs) {
      const item = this.state.switchs[index];
      for (const indexU in deviceConf?.units) {
        const unit = deviceConf?.units[indexU];
        if (parseInt(unit.unitCode) === parseInt(item.unit + "")) {
          this.state.switchs[index].name = unit.name;
        }
      }
    }
  }
}

export class EntityState {
  id: string = "";
  type: string = "";
  subtype: string = "";
}

export class BridgeInfo {
  coordinator: RfxcomInfo = new RfxcomInfo();
  version: string = "";
  logLevel: string = "";
}

export class DeviceBridge {
  public model: string = "Bridge";
  public name: string = "Rfxcom2Mqtt Bridge";
  public manufacturer: string = "Rfxcom2Mqtt";

  constructor(
    public identifiers: string[] = [],
    public hw_version: string = "",
    public sw_version: string = "",
  ) {}
}
