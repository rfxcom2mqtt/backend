import { RfxcomInfo } from "./rfxcom";

export interface KeyValue {
  [s: string]: any;
}

export class DeviceEntity {
  public manufacturer: string = "Rfxcom";
  public via_device: string = "rfxcom2mqtt_bridge";
  public identifiers: string[] = [];
  public name: string = "";

  constructor(
    identifiers: string[] = [],
    //public model: string = '',
    name: string = "",
  ) {
    this.identifiers = identifiers;
    this.name = name;
  }
}

export class DeviceSensor {
  constructor(
    public id: string = "",
    public label: string = "",
    public description: string = "",
    public property: string = "",
    public type: string = "",
    public unit: string = "",
  ) {}
}

export class DeviceSwitch {
  constructor(
    public id: string = "",
    public label: string = "",
    public description: string = "On/off state of the switch",
    public property: string = "command",
    public type: string = "binary",
    public value_off: string = "Off",
    public value_on: string = "On",
  ) {}
}

export class DeviceState extends DeviceEntity {
  public id: string = "";
  public type: string = "";
  public subtype: number = 0;
  public subTypeValue: string = "";
  entities: string[] = [];
  sensors: { [s: string]: DeviceSensor } = {};
  switchs: { [s: string]: DeviceSwitch } = {};

  constructor(identifiers: string[], name: string) {
    super(identifiers, name);
  }
}

export class DeviceStateStore {
  public state: DeviceState;

  constructor(state: DeviceState) {
    this.state = state;
  }

  getInfo() {
    return new DeviceEntity(this.state.identifiers, this.state.name);
  }

  addEntity(entityId: string) {
    if (!this.state.entities.includes(entityId)) {
      this.state.entities.push(entityId);
    }
  }

  addSensorId(sensorId: string) {
    this.addSensor(new DeviceSensor(sensorId, sensorId));
  }

  addSensor(sensor: DeviceSensor) {
    if (this.state.sensors[sensor.id] === undefined) {
      this.state.sensors[sensor.id] = sensor;
    }
  }

  addSwitchId(switchId: string) {
    this.addSwitch(new DeviceSwitch(switchId, switchId));
  }

  addSwitch(dswitch: DeviceSwitch) {
    if (this.state.switchs[dswitch.id] === undefined) {
      this.state.switchs[dswitch.id] = dswitch;
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
