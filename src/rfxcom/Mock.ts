import rfxcom from "rfxcom";
import { SettingRfxcom, settingsService } from "../settings";
import {
  RfxcomInfo,
  Lighting2Event,
  Lighting4Event,
  RfxcomEvent,
  TemphumbaroEvent,
  TemphumidityEvent,
  TempEvent,
  Bbq1Event,
  HumidityEvent,
  UvEvent,
  WeightEvent,
  WaterlevelEvent,
  Security1Event,
  CommandRfxcomEvent,
} from "../models/rfxcom";
import IRfxcom from "./interface";

import { loggerFactory } from "../utils/logger";
const logger = loggerFactory.getLogger("RFXCOM");

const rfxcomEvents: RfxcomEvent[] = [];

rfxcomEvents.push({
  id: "0x011Bmocked_device2",
  seqnbr: 7,
  subtype: 0,
  unitCode: "1",
  commandNumber: 0,
  level: 0,
  rssi: 5,
  type: "lighting2",
  subTypeValue: "AC",
} as Lighting2Event);
rfxcomEvents.push({
  id: "0x011Bmocked_device2",
  seqnbr: 7,
  subtype: 0,
  unitCode: "2",
  commandNumber: 0,
  level: 0,
  rssi: 5,
  type: "lighting2",
  subTypeValue: "AC",
} as Lighting2Event);
rfxcomEvents.push({
  id: "temphumbaro_device",
  seqnbr: 1,
  subtype: 1,
  temperature: "19",
  humidity: "60",
  humidityStatus: "Off",
  barometer: "1040",
  forecast: "",
  batteryLevel: 100,
  rssi: 5,
  type: "tempHumBaro1",
} as TemphumbaroEvent);
rfxcomEvents.push({
  id: "temphum_device",
  seqnbr: 1,
  subtype: 1,
  temperature: "19",
  humidity: "60",
  humidityStatus: "Off",
  batteryLevel: 100,
  rssi: 5,
  type: "temperatureHumidity1",
} as TemphumidityEvent);
rfxcomEvents.push({
  id: "temp_device",
  seqnbr: 1,
  subtype: 1,
  temperature: "19",
  batteryLevel: 100,
  rssi: 5,
  type: "temperature1",
} as TempEvent);
rfxcomEvents.push({
  id: "bbp1_device",
  seqnbr: 1,
  subtype: 1,
  temperature: "19",
  batteryLevel: 100,
  rssi: 5,
  type: "bbq1",
} as Bbq1Event);
rfxcomEvents.push({
  id: "uv1_device",
  seqnbr: 1,
  subtype: 1,
  temperature: "19",
  uv: 2,
  batteryLevel: 100,
  rssi: 5,
  type: "uv1",
} as UvEvent);
rfxcomEvents.push({
  id: "hum_device",
  seqnbr: 1,
  subtype: 1,
  humidity: "60",
  humidityStatus: "Off",
  batteryLevel: 100,
  rssi: 5,
  type: "humidity1",
} as HumidityEvent);
rfxcomEvents.push({
  id: "weight_device",
  seqnbr: 1,
  subtype: 1,
  weight: 60,
  batteryLevel: 100,
  rssi: 5,
  type: "weight1",
} as WeightEvent);

rfxcomEvents.push({
  id: "waterlevel_device",
  seqnbr: 1,
  subtype: 0,
  temperature: "10",
  level: 50,
  batteryLevel: 100,
  rssi: 5,
  type: "waterlevel",
} as WaterlevelEvent);

rfxcomEvents.push({
  id: "x10_door",
  subtype: 0,
  deviceStatus: "2",
  batteryLevel: "OK",
  rssi: 5,
  type: "security1",
} as Security1Event);

export default class MockRfxcom implements IRfxcom {
  constructor() {}

  private getConfig(): SettingRfxcom {
    return settingsService.get().rfxcom;
  }

  initialise(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info("Mock device initialised");
      resolve();
    });
  }
  getStatus(callback: any) {
    logger.info("Mock get status");
    callback("online");
  }
  onStatus(callback: any) {
    logger.info("Mock on status");
    const rfxcomInfo = new RfxcomInfo();
    rfxcomInfo.receiverTypeCode = 83;
    rfxcomInfo.receiverType = "Mock";
    rfxcomInfo.hardwareVersion = "1.2";
    rfxcomInfo.firmwareVersion = 242;
    rfxcomInfo.firmwareType = "Ext";
    rfxcomInfo.enabledProtocols = [
      "LIGHTING4",
      "LACROSSE",
      "AC",
      "OREGON",
      "HOMECONFORT",
    ];
    callback(rfxcomInfo);
  }
  onCommand(
    deviceType: string,
    entityName: string,
    payload: any,
    deviceConf: any,
  ) {
    logger.info("Mock on command");
  }
  onDisconnect(callback: any) {
    logger.info("Mock on disconnect");
    callback({});
  }
  subscribeProtocolsEvent(callback: any) {
    logger.info("Mock subscribeProtocolsEvent");
    rfxcomEvents.forEach((event) => {
      //event.deviceName = rfxcom.deviceNames[event.type][event.subtype];
      let deviceId = event.id;
      if (event.type === "lighting4") {
        deviceId = (event as Lighting4Event).data;
      }
      if (this.isDeviceCommand(event)) {
        (event as CommandRfxcomEvent).command = rfxcom.commandName(
          rfxcom.packetNames[event.type.toLocaleLowerCase()],
          event.subtype,
          (event as CommandRfxcomEvent).commandNumber,
        );
      }
      if (event.type === "security1") {
        (event as Security1Event).status = this.getSecurityStatus(
          parseInt((event as Security1Event).deviceStatus),
        );
      }
      event.group = this.isGroup(event);
      event.subTypeValue = this.getSubType(event.type, "" + event.subtype);
      callback(event.type, event);
    });
  }

  isDeviceCommand(payload: any): boolean {
    if (
      payload.type === "lighting1" ||
      payload.type === "lighting2" ||
      payload.type === "lighting5" ||
      payload.type === "lighting6" ||
      payload.type === "chime1" ||
      payload.type === "fan" ||
      payload.type === "blinds1" ||
      payload.type === "edisio" ||
      payload.type === "activlink" ||
      payload.type === "funkbus" ||
      payload.type === "hunterFan" ||
      payload.type === "camera1" ||
      payload.type === "remote" ||
      payload.type === "blinds2" ||
      payload.type === "thermostat3"
    ) {
      return true;
    }
    return false;
  }

  isGroup(payload: any): boolean {
    if (payload.type === "lighting2") {
      return payload.commandNumber === 3 || payload.commandNumber === 4;
    }
    return false;
  }
  getSubType(type: string, subType: string): string {
    logger.info("Mock get subtype : " + type + "." + subType);
    let returnValue = "";
    if (rfxcom.packetNames[type.toLocaleLowerCase()] !== undefined) {
      if (rfxcom[type] !== undefined) {
        rfxcom[type].forEach(function (subTypeName: string) {
          if (parseInt(subType) === parseInt(rfxcom[type][subTypeName])) {
            returnValue = subTypeName;
          }
        });
      }
    }

    return returnValue;
  }

  getSecurityStatus(key: number): string {
    logger.info("Mock get security status : " + key);
    let returnValue = "";
    Object.keys(rfxcom.security)
      .filter(
        (ele, ind) =>
          ![
            "X10_DOOR_WINDOW_SENSOR",
            "X10_MOTION_SENSOR",
            "X10_SECURITY_REMOTE",
          ].includes(ele),
      )
      .forEach(function (statusValue: string) {
        if (key === parseInt(rfxcom.security[statusValue])) {
          returnValue = statusValue;
        }
      });

    return returnValue;
  }

  stop() {
    logger.info("Mock stop");
  }

  sendCommand(
    deviceType: string,
    subTypeValue: string,
    command: string | undefined,
    entityName: string,
  ) {
    logger.info("Mock send command : " + command);
  }
}
