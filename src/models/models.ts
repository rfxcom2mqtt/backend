import { RfxcomInfo } from "./rfxcom";

export interface KeyValue {
  [s: string]: any;
}

export class DeviceState {
  id: string = "";
  type: string = "";
  subtype: string = "";
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

export class DeviceEntity {
  public manufacturer: string = "Rfxcom";
  public via_device: string = "rfxcom2mqtt_bridge";

  constructor(
    public identifiers: string[] = [],
    //public model: string = '',
    public name: string = "",
  ) {}
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
