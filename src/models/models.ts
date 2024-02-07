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

export class DeviceState extends DeviceEntity {
  public id: string = "";
  public type: string = "";
  public subtype: string = "";
  entities: string[] = [];
  sensors: string[] = [];
  switchs: string[] = [];

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

  addSensor(sensorId: string) {
    if (!this.state.entities.includes(sensorId)) {
      this.state.sensors.push(sensorId);
    }
  }

  addSwitch(switchId: string) {
    if (!this.state.entities.includes(switchId)) {
      this.state.switchs.push(switchId);
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
