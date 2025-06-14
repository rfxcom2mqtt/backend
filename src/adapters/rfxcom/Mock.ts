import rfxcom from "rfxcom";
import { loggerFactory } from "../../utils/logger";

import {
  SettingDevice,
  SettingRfxcom,
  settingsService,
} from "../../config/settings";
import IRfxcom, {
  CommandPayload,
  OnStatusCallback,
  RfxcomEventHandler,
  StatusCallback,
} from "../../core/services/rfxcom.service";

import {
  RfxcomInfo,
  Lighting2Event,
  Lighting4Event,
  Lighting1Event,
  Lighting5Event,
  Lighting6Event,
  RfxcomEvent,
  TemphumbaroEvent,
  TemphumidityEvent,
  TempEvent,
  Bbq1Event,
  HumidityEvent,
  UvEvent,
  WeightEvent,
  WaterlevelEvent,
  Blinds1Event,
  Security1Event,
  ChimeEvent,
  FanEvent,
} from "../../core/models/rfxcom";

const logger = loggerFactory.getLogger("RFXCOM");

const rfxcomEvents: RfxcomEvent[] = [];

// Lighting2 events
rfxcomEvents.push({
  id: "0x011Bmocked_device2",
  seqnbr: 7,
  subtype: 0,
  unitCode: "1",
  commandNumber: 0,
  command: "Off",
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
  command: "On",
  level: 0,
  rssi: 5,
  type: "lighting2",
  subTypeValue: "AC",
} as Lighting2Event);

// Lighting1 events
rfxcomEvents.push({
  id: "0x011Cmocked_lighting1",
  seqnbr: 8,
  subtype: 0,
  houseCode: "A",
  unitCode: "1",
  commandNumber: 0,
  command: "Off",
  rssi: 5,
  type: "lighting1",
  subTypeValue: "X10",
} as Lighting1Event);
rfxcomEvents.push({
  id: "0x011Cmocked_lighting1",
  seqnbr: 9,
  subtype: 0,
  houseCode: "A",
  unitCode: "2",
  commandNumber: 1,
  command: "On",
  rssi: 5,
  type: "lighting1",
  subTypeValue: "X10",
} as Lighting1Event);

// Lighting5 events
rfxcomEvents.push({
  id: "0x011Dmocked_lighting5",
  seqnbr: 10,
  subtype: 0,
  unitCode: "1",
  commandNumber: 0,
  command: "Off",
  level: "0",
  rssi: 5,
  type: "lighting5",
  subTypeValue: "LIGHTWAVERF",
} as Lighting5Event);
rfxcomEvents.push({
  id: "0x011Dmocked_lighting5",
  seqnbr: 11,
  subtype: 0,
  unitCode: "2",
  commandNumber: 1,
  command: "On",
  level: "15",
  rssi: 5,
  type: "lighting5",
  subTypeValue: "LIGHTWAVERF",
} as Lighting5Event);

// Blinds1 events
rfxcomEvents.push({
  id: "0x011Emocked_blinds1",
  seqnbr: 12,
  subtype: 0,
  unitCode: 1,
  commandNumber: 0,
  command: "Open",
  batteryLevel: 100,
  rssi: 5,
  type: "blinds1",
  subTypeValue: "BLINDST0",
} as Blinds1Event);
rfxcomEvents.push({
  id: "0x011Emocked_blinds1",
  seqnbr: 13,
  subtype: 0,
  unitCode: 2,
  commandNumber: 1,
  command: "Close",
  batteryLevel: 100,
  rssi: 5,
  type: "blinds1",
  subTypeValue: "BLINDST0",
} as Blinds1Event);

// Security1 events
rfxcomEvents.push({
  id: "0x011Fmocked_security1",
  seqnbr: 14,
  subtype: 0,
  deviceStatus: "Normal",
  tampered: "No",
  batteryLevel: "100",
  rssi: 5,
  type: "security1",
  subTypeValue: "X10_SECURITY",
} as Security1Event);
rfxcomEvents.push({
  id: "0x011Fmocked_security1",
  seqnbr: 15,
  subtype: 0,
  deviceStatus: "Alert",
  tampered: "Yes",
  batteryLevel: "50",
  rssi: 5,
  type: "security1",
  subTypeValue: "X10_SECURITY",
} as Security1Event);
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
  getStatus(callback: StatusCallback) {
    logger.info("Mock get status");
    callback("online");
  }
  onStatus(callback: OnStatusCallback) {
    logger.info("Mock on status");
    const rfxcomInfo = new RfxcomInfo();
    rfxcomInfo.receiverTypeCode = 83;
    rfxcomInfo.receiverType = "Mock";
    rfxcomInfo.hardwareVersion = "1.2";
    rfxcomInfo.firmwareVersion = 242;
    rfxcomInfo.firmwareType = "Ext";
    rfxcomInfo.enabledProtocols = [
      "LIGHTING1",
      "LIGHTING2",
      "LIGHTING3",
      "LIGHTING4",
      "LIGHTING5",
      "LIGHTING6",
      "BLINDS1",
      "SECURITY1",
      "TEMPERATURE1",
      "TEMPERATUREHUMIDITY1",
      "TEMPHUMBAROBARO1",
      "HUMIDITY1",
      "BBQ1",
      "UV1",
      "WEIGHT1",
      "WATERLEVEL",
      "LACROSSE",
      "AC",
      "OREGON",
      "HOMECONFORT",
    ];
    callback(rfxcomInfo);
  }
  /**
   * Handles a command for a device
   * @param deviceType The type of device
   * @param entityName The entity name or ID
   * @param payload The command payload
   * @param deviceConf Optional device configuration
   */
  onCommand(
    deviceType: string,
    entityName: string,
    payload: CommandPayload | string,
    deviceConf?: SettingDevice,
  ) {
    logger.info(`Mock command received: ${deviceType} - ${entityName}`);
    
    // Log the payload for debugging
    if (typeof payload === "string") {
      try {
        const parsedPayload = JSON.parse(payload);
        logger.debug(`Command payload: ${JSON.stringify(parsedPayload)}`);
      } catch (error) {
        logger.debug(`Command payload (raw): ${payload}`);
      }
    } else {
      logger.debug(`Command payload: ${JSON.stringify(payload)}`);
    }
    
    // Log device config if available
    if (deviceConf) {
      logger.debug(`Device config: ${JSON.stringify(deviceConf)}`);
    }
  }
  onDisconnect(callback: (evt: Record<string, unknown>) => void) {
    logger.info("Mock on disconnect");
    callback({});
  }
  subscribeProtocolsEvent(callback: RfxcomEventHandler) {
    logger.info("Mock subscribeProtocolsEvent");
    rfxcomEvents.forEach((event) => {
      //event.deviceName = rfxcom.deviceNames[event.type][event.subtype];
      let deviceId = event.id;
      if (event.type === "lighting4") {
        deviceId = (event as Lighting4Event).data;
      }
      event.subTypeValue = this.getSubType(event.type, "" + event.subtype);
      callback(event.type, event);
    });
  }
  /**
   * Determines if the event is a group command
   * @param payload The RFXCOM event
   * @returns true if the event is a group command
   */
  isGroup(payload: RfxcomEvent): boolean {
    if (payload.type === "lighting2") {
      const lighting2Payload = payload as Lighting2Event;
      return (
        lighting2Payload.commandNumber === 3 ||  // Group On
        lighting2Payload.commandNumber === 4     // Group Off
      );
    }
    if (payload.type === "lighting1") {
      const lighting1Payload = payload as Lighting1Event;
      return (
        lighting1Payload.commandNumber === 5 ||  // Group On
        lighting1Payload.commandNumber === 6     // Group Off
      );
    }
    if (payload.type === "lighting5") {
      const lighting5Payload = payload as Lighting5Event;
      return (
        lighting5Payload.commandNumber === 3 ||  // Group On
        lighting5Payload.commandNumber === 4     // Group Off
      );
    }
    if (payload.type === "lighting6") {
      const lighting6Payload = payload as Lighting6Event;
      return (
        lighting6Payload.commandNumber === 2 ||  // Group On
        lighting6Payload.commandNumber === 3     // Group Off
      );
    }
    if (payload.type === "blinds1") {
      const blinds1Payload = payload as Blinds1Event;
      return (
        blinds1Payload.commandNumber === 7       // Group commands for blinds
      );
    }
    if (payload.type === "security1") {
      const security1Payload = payload as Security1Event;
      // Some security1 devices support group commands
      return security1Payload.deviceStatus?.toLowerCase().includes("group") || false;
    }
    if (payload.type === "chime") {
      const chimePayload = payload as ChimeEvent;
      // Some chime devices support group commands
      return chimePayload.command?.toLowerCase().includes("all") || false;
    }
    if (payload.type === "fan") {
      const fanPayload = payload as FanEvent;
      // Some fan controllers support group commands
      return fanPayload.command?.toLowerCase().includes("all") || false;
    }
    return false;
  }
  /**
   * Gets the subtype name for a given type and subtype value
   * @param type The device type
   * @param subType The subtype value
   * @returns The subtype name
   */
  getSubType(type: string, subType: string): string {
    logger.debug(`Mock get subtype: ${type}.${subType}`);
    let returnValue = "";
    
    // Convert type to lowercase for case-insensitive comparison
    const typeLower = type.toLowerCase();
    
    if (rfxcom.packetNames[typeLower] !== undefined) {
      if (rfxcom[type] !== undefined) {
        // Use Object.keys to iterate over the object properties
        Object.keys(rfxcom[type]).forEach(function (subTypeName: string) {
          if (parseInt(subType) === parseInt(rfxcom[type][subTypeName])) {
            returnValue = subTypeName;
          }
        });
      }
    }

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
