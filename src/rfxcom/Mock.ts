import { SettingRfxcom } from "../settings";
import { RfxcomInfo } from "../models/rfxcom";
import IRfxcom from "./interface";

import { Logger } from "../libs/logger";
const logger = Logger.getLogger("RFXCOM")

export default class MockRfxcom implements IRfxcom {
  private config: SettingRfxcom;

  constructor(config: SettingRfxcom) {
    this.config = config;
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
  onCommand(deviceType: string, entityName: string, payload: any) {
    logger.info("Mock on command");
  }
  onDisconnect(callback: any) {
    logger.info("Mock on disconnect");
    callback({});
  }
  subscribeProtocolsEvent(callback: any) {
    logger.info("Mock subscribeProtocolsEvent");
    const deviceId = "mocked_device2";
    const deviceConf = this.config.devices.find(
      (dev: any) => dev.id === deviceId,
    );
    callback(
      "lighting2",
      {
        id: deviceId,
        seqnbr: 7,
        subtype: 0,
        unitCode: "1",
        commandNumber: 0,
        command: "Off",
        level: 0,
        rssi: 5,
        type: "lighting2",
        subTypeValue: "AC",
      },
      deviceConf,
    );
  }
  isGroup(payload: any): boolean {
    if (payload.type === "lighting2") {
      return payload.commandNumber === 3 || payload.commandNumber === 4;
    }
    return false;
  }
  getSubType(type: string, subType: string) {
    logger.info("Mock get subtype");
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
