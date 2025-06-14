import rfxcom from "rfxcom";
import { SettingDevice, settingsService } from "../../config/settings";
import { loggerFactory } from "../../utils/logger";
import MockRfxcom from "./Mock";

import {
  RfxcomInfo,
  RfxcomEvent,
  Lighting2Event,
  Lighting4Event,
  Lighting1Event,
  Lighting6Event,
  Lighting5Event,
  Blinds1Event,
  ChimeEvent,
  Security1Event,
  FanEvent,
} from "../../core/models/rfxcom";
import IRfxcom, {
  CommandPayload,
  OnStatusCallback,
  RfxcomEventHandler,
  StatusCallback,
} from "../../core/services/rfxcom.service";

const logger = loggerFactory.getLogger("RFXCOM");

/**
 * List of supported protocols for RFXCOM
 */
const SUPPORTED_PROTOCOLS = [
  "lighting1",
  "lighting2",
  "lighting3",
  "lighting4",
  "lighting5",
  "lighting6",
  "curtain1",
  "blinds1",
  "blinds2",
  "security1",
  "security2",
  "camera1",
  "remote",
  "thermostat1",
  "thermostat2",
  "thermostat3",
  "thermostat4",
  "bbq1",
  "temperaturerain1",
  "temperature1",
  "temperature2",
  "humidity1",
  "temperaturehumidity1",
  "temphumbarobaro1",
  "temphumbarobaro2",
  "rain1",
  "rain2",
  "rain3",
  "rain4",
  "rain5",
  "rain6",
  "rain7",
  "rain8",
  "rain9",
  "wind1",
  "wind2",
  "wind3",
  "wind4",
  "wind5",
  "wind6",
  "wind7",
  "uv1",
  "uv2",
  "uv3",
  "datetime",
  "elec1",
  "elec2",
  "elec3",
  "elec4",
  "elec5",
  "weight1",
  "weight2",
  "cartelectronic",
  "rfxsensor",
  "rfxmeter",
  "waterlevel",
  "lightning1",
  "lightning2",
  "lightning3",
  "lightning4",
  "lightning5",
  "lightning6",
  "lightning7",
  "funkbus",
  "edisio",
  "hunter",
  "activlink",
  "weather1",
  "weather2",
  "solar1",
  "solar2",
  "solar3",
  "solar4",
  "solar5",
  "solar6",
  "solar7",
];

export function getRfxcomInstance(): IRfxcom {
  return settingsService.get().rfxcom.usbport === "mock"
    ? new MockRfxcom()
    : new Rfxcom();
}

export default class Rfxcom implements IRfxcom {
  private debug: boolean;
  private rfxtrx: rfxcom.RfxCom;

  constructor() {
    this.debug = this.getConfig().debug ? this.getConfig().debug : false;
    this.rfxtrx = new rfxcom.RfxCom(this.getConfig().usbport, {
      debug: this.debug,
    });
  }

  private getConfig() {
    return settingsService.get().rfxcom;
  }

  private getRfxcomDevices() {
    return Object.keys(rfxcom);
  }

  get() {
    return this.rfxtrx;
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
   * Initializes the RFXCOM device
   * @returns A promise that resolves when the device is initialized
   */
  async initialise(): Promise<void> {
    logger.info(`Connecting to RFXCOM at ${this.getConfig().usbport}`);
    return new Promise((resolve, reject) => {
      this.rfxtrx.initialise((error: Error | null) => {
        if (error) {
          logger.error(`Unable to initialise the RFXCOM device: ${error.message}`);
          reject(`Unable to initialise the RFXCOM device: ${error.message}`);
        } else {
          logger.info("RFXCOM device initialised");
          // Enable protocols after initialization
          this.enableRFXProtocols();
          resolve();
        }
      });
    });
  }

  private validRfxcomDevice(device: string) {
    return (
      this.getRfxcomDevices().find(
        (rfxcomDevice) => device === rfxcomDevice,
      ) !== undefined
    );
  }

  private validRfxcomDeviceFunction(device: string, deviceFunction: string) {
    if (rfxcom[device] === undefined) {
      return false;
    }

    const deviceFunctions = Object.getOwnPropertyNames(
      rfxcom[device].prototype,
    );
    return (
      deviceFunctions.find(
        (rfxcomDeviceFunction) => rfxcomDeviceFunction === deviceFunction,
      ) !== undefined
    );
  }

  /**
   * Enables the configured RFXCOM protocols
   */
  protected enableRFXProtocols() {
    const config = this.getConfig();
    if (!config.receive || config.receive.length === 0) {
      logger.warn("No RFXCOM protocols configured for receiving. Using default protocols.");
      // Use a default set of common protocols if none are configured
      config.receive = [
        "lighting1",
        "lighting2",
        "lighting3",
        "lighting4",
        "lighting5",
        "lighting6",
        "temperaturehumidity1",
        "temperature1",
        "humidity1",
      ];
    }

    // Validate protocols against supported list
    const validProtocols = config.receive.filter(protocol => 
      SUPPORTED_PROTOCOLS.includes(protocol.toLowerCase())
    );

    if (validProtocols.length !== config.receive.length) {
      const invalidProtocols = config.receive.filter(protocol => 
        !SUPPORTED_PROTOCOLS.includes(protocol.toLowerCase())
      );
      logger.warn(`Some configured protocols are not supported: ${invalidProtocols.join(', ')}`);
      logger.info(`Using valid protocols: ${validProtocols.join(', ')}`);
    }

    this.rfxtrx.enableRFXProtocols(
      validProtocols,
      (evt: Record<string, unknown>) => {
        logger.info(`RFXCOM protocols enabled: ${validProtocols.join(', ')}`);
      },
    );
  }

  /**
   * Gets the status of the RFXCOM device
   * @param callback Callback function to receive the status
   */
  getStatus(callback: StatusCallback) {
    this.rfxtrx.getRFXStatus((error: Error | null) => {
      if (error) {
        logger.error(`Healthcheck: RFX Status ERROR: ${error.message}`);
        callback("offline");
      } else {
        callback("online");
      }
    });
  }

  /**
   * Registers a callback for status events
   * @param callback Callback function to receive status events
   */
  onStatus(callback: OnStatusCallback) {
    logger.info("RFXCOM listen status event");
    this.rfxtrx.on("status", (evt: Record<string, unknown>) => {
      // Filter out some fields for cleaner logging
      const json = JSON.stringify(
        evt,
        (key, value) => {
          if (key === "subtype" || key === "seqnbr" || key === "cmnd") {
            return undefined;
          }
          return value;
        },
        2,
      );
      
      if (json !== undefined) {
        logger.debug(`RFXCOM status event: ${json}`);
        try {
          const parsedInfo = JSON.parse(json) as RfxcomInfo;
          callback(parsedInfo);
        } catch (error) {
          logger.error(`Error parsing RFXCOM status: ${error}`);
        }
      }
    });
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
    try {
      // Convert deviceType to lowercase for case-insensitive comparison
      const deviceTypeLower = deviceType?.toLowerCase();
      
      // Special handling for specific device types
      if (deviceTypeLower === "rfy") {
        this.onCommandRfy(deviceType, entityName, payload, deviceConf);
        return;
      } else if (deviceTypeLower === "blinds1") {
        this.onCommandBlinds(deviceType, entityName, payload, deviceConf);
        return;
      } else if (deviceTypeLower === "lighting5") {
        this.onCommandLighting5(deviceType, entityName, payload, deviceConf);
        return;
      }
      
      // Default handling for other device types
      this.onCommandDefault(deviceType, entityName, payload, deviceConf);
    } catch (error) {
      logger.error(`Error processing command for ${deviceType}.${entityName}: ${error}`);
    }
  }

  /**
   * Handles RFY (Somfy) commands
   * @param deviceType The type of device
   * @param entityName The entity name or ID
   * @param payload The command payload
   * @param deviceConf Optional device configuration
   */
  private onCommandRfy(
    deviceType: string,
    entityName: string,
    payload: CommandPayload | string,
    deviceConf?: SettingDevice,
  ) {
    logger.debug(
      `Use RFY command: {"deviceType": "${deviceType}", "entityName": "${entityName}", "payload": ${typeof payload === 'string' ? payload : JSON.stringify(payload)}, "deviceConf": ${JSON.stringify(deviceConf)}}`,
    );

    const deviceIds = deviceConf ? [deviceConf.id] : entityName.split(",");
    
    // Process each device ID
    deviceIds.forEach((deviceId) => {
      try {
        // Parse payload if it's a string
        const payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;
        
        // Get blinds mode from config or payload
        const blindsMode = deviceConf?.blindsMode || 
                          (typeof payload !== "string" ? payloadObj.blindsMode : undefined) || 
                          "EU";
        
        // Get subtype from config or payload
        const subtype = deviceConf?.subtype || 
                       (typeof payload !== "string" ? payloadObj.subtype : undefined) || 
                       "RFY";
        
        // Create RFY device
        const rfy = new rfxcom.Rfy(this.rfxtrx.get(), subtype, {
          venetianBlindsMode: blindsMode,
        });
        
        // Send command
        logger.info(
          `Send RFY command '${payloadObj.command}' to deviceid: ${deviceId}, devicename: ${deviceConf?.name || 'unknown'}`,
        );
        rfy.doCommand([deviceId, "1"], payloadObj.command);
      } catch (error) {
        logger.error(
          `Error processing RFY command for ${deviceId}: ${error}. Payload: ${payload}`,
        );
      }
    });
  }
  
  /**
   * Handles Blinds1 commands
   * @param deviceType The type of device
   * @param entityName The entity name or ID
   * @param payload The command payload
   * @param deviceConf Optional device configuration
   */
  private onCommandBlinds(
    deviceType: string,
    entityName: string,
    payload: CommandPayload | string,
    deviceConf?: SettingDevice,
  ) {
    logger.debug(
      `Use Blinds command: {"deviceType": "${deviceType}", "entityName": "${entityName}", "payload": ${typeof payload === 'string' ? payload : JSON.stringify(payload)}, "deviceConf": ${JSON.stringify(deviceConf)}}`,
    );

    try {
      // Parse payload if it's a string
      const payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;
      
      // Get subtype from config or payload
      const subtype = deviceConf?.subtype || 
                     (typeof payload !== "string" ? payloadObj.subtype : undefined);
      
      if (!subtype) {
        throw new Error("Blinds1 subtype not defined in payload or config");
      }
      
      // Create Blinds1 device
      const blinds = new rfxcom.Blinds1(this.rfxtrx.get(), subtype);
      
      // Get device ID from config or entity name
      const deviceId = deviceConf?.id || entityName;
      
      // Get command from payload
      const command = payloadObj.command;
      
      if (!command) {
        throw new Error("Command not specified in payload");
      }
      
      // Send command
      logger.info(
        `Send Blinds1 command '${command}' to deviceid: ${deviceId}, devicename: ${deviceConf?.name || 'unknown'}`,
      );
      
      // Execute the command
      if (blinds[command]) {
        blinds[command](deviceId);
      } else {
        throw new Error(`Unknown Blinds1 command: ${command}`);
      }
    } catch (error) {
      logger.error(
        `Error processing Blinds1 command: ${error}. Payload: ${payload}`,
      );
    }
  }
  
  /**
   * Handles Lighting5 commands
   * @param deviceType The type of device
   * @param entityName The entity name or ID
   * @param payload The command payload
   * @param deviceConf Optional device configuration
   */
  private onCommandLighting5(
    deviceType: string,
    entityName: string,
    payload: CommandPayload | string,
    deviceConf?: SettingDevice,
  ) {
    logger.debug(
      `Use Lighting5 command: {"deviceType": "${deviceType}", "entityName": "${entityName}", "payload": ${typeof payload === 'string' ? payload : JSON.stringify(payload)}, "deviceConf": ${JSON.stringify(deviceConf)}}`,
    );

    try {
      // Parse payload if it's a string
      const payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;
      
      // Get subtype from config or payload
      const subtype = deviceConf?.subtype || 
                     (typeof payload !== "string" ? payloadObj.subtype : undefined);
      
      if (!subtype) {
        throw new Error("Lighting5 subtype not defined in payload or config");
      }
      
      // Create Lighting5 device
      const lighting5 = new rfxcom.Lighting5(this.rfxtrx.get(), subtype);
      
      // Get device ID from config or entity name
      const deviceId = deviceConf?.id || entityName;
      
      // Get command and value from payload
      const command = payloadObj.deviceFunction || payloadObj.command;
      const value = payloadObj.value;
      
      if (!command) {
        throw new Error("Command not specified in payload");
      }
      
      // Send command
      logger.info(
        `Send Lighting5 command '${command}' to deviceid: ${deviceId}, devicename: ${deviceConf?.name || 'unknown'}${value ? ` with value: ${value}` : ''}`,
      );
      
      // Execute the command with or without value
      if (value !== undefined) {
        lighting5[command](deviceId, value);
      } else {
        lighting5[command](deviceId);
      }
    } catch (error) {
      logger.error(
        `Error processing Lighting5 command: ${error}. Payload: ${payload}`,
      );
    }
  }

  /**
   * Default command handler for most device types
   * @param deviceType The type of device
   * @param entityName The entity name or ID
   * @param payload The command payload
   * @param deviceConf Optional device configuration
   */
  private onCommandDefault(
    deviceType: string,
    entityName: string,
    payload: CommandPayload | string,
    deviceConf?: SettingDevice,
  ) {
    try {
      let transmitRepetitions: number | undefined;
      let subtype: string;

      // Validate device type
      if (!this.validRfxcomDevice(deviceType)) {
        logger.warn(`${deviceType} is not a valid RFXCOM device type`);
        return;
      }

      // Handle string vs object payload
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload) as CommandPayload;
        } catch (error) {
          logger.error(`Payload is not a valid JSON format: ${payload}`);
          return;
        }
      }

      // Get subtype from payload
      subtype = payload.subtype || "";

      // Get device function from payload
      const deviceFunction = payload.deviceFunction || payload.command || "";

      // Validate device function
      if (!deviceFunction) {
        logger.warn(`No device function specified for ${deviceType}`);
        return;
      }
      
      if (!this.validRfxcomDeviceFunction(deviceType, deviceFunction)) {
        logger.warn(`${deviceFunction} is not a valid function for device type ${deviceType}`);
        return;
      }
      
      // Get value and options from payload
      const value = payload.value;
      let deviceOptions = payload.deviceOptions;

      // Apply device configuration if available
      if (deviceConf instanceof Object) {
        // Override entity name with device ID if available
        if (deviceConf.id !== undefined) {
          entityName = deviceConf.id;
        }

        // Override device type if specified in config
        if (deviceConf.type !== undefined) {
          if (!this.validRfxcomDevice(deviceConf.type)) {
            throw new Error(`${deviceConf.type} from config is not a valid device type`);
          }
          deviceType = deviceConf.type;
        }

        // Use device options from config
        deviceOptions = deviceConf.options;

        // Override subtype if specified in config
        if (deviceConf.subtype !== undefined) {
          subtype = deviceConf.subtype;
        }

        // Get transmit repetitions from config
        transmitRepetitions = deviceConf.repetitions;
      }

      // Validate subtype
      if (!subtype) {
        throw new Error(`Subtype not defined in payload or config for ${deviceType}`);
      }

      // Instantiate the device class
      let device;
      if (deviceOptions) {
        device = new rfxcom[deviceType](
          this.rfxtrx.get(),
          subtype,
          deviceOptions,
        );
      } else {
        device = new rfxcom[deviceType](this.rfxtrx.get(), subtype);
      }

      // Determine number of repetitions
      const repeat: number = transmitRepetitions ? transmitRepetitions : 1;
      
      // Execute the command the specified number of times
      for (let i: number = 0; i < repeat; i++) {
        // Execute the command with or without value
        if (value !== undefined) {
          device[deviceFunction](entityName, value);
        } else {
          device[deviceFunction](entityName);
        }

        logger.debug(
          `${deviceType} ${entityName} - Function: ${deviceFunction}${value !== undefined ? `, Value: ${value}` : ''} (Repetition ${i + 1}/${repeat})`,
        );
      }
      
      logger.info(
        `Sent ${deviceType} command '${deviceFunction}' to ${entityName}${value !== undefined ? ` with value: ${value}` : ''}${repeat > 1 ? ` (${repeat} repetitions)` : ''}`,
      );
    } catch (error) {
      logger.error(
        `Error processing command for ${deviceType}.${entityName}: ${error}`,
      );
    }
  }

  /**
   * Registers a callback for disconnect events
   * @param callback Callback function to receive disconnect events
   */
  onDisconnect(callback: (evt: Record<string, unknown>) => void) {
    logger.info("RFXCOM listen disconnect event");
    this.rfxtrx.on("disconnect", (evt: Record<string, unknown>) => {
      callback(evt);
      logger.info("RFXCOM Disconnected");
    });
  }

  /**
   * Subscribes to protocol events
   * @param callback Callback function to receive protocol events
   */
  subscribeProtocolsEvent(callback: RfxcomEventHandler) {
    if (this.getConfig().receive) {
      // Subscribe to specific rfxcom events
      this.getConfig().receive.forEach((protocol: string) => {
        logger.info("RFXCOM listen event for protocol : " + protocol);
        this.rfxtrx.on(protocol, (evt: RfxcomEvent, packetType: string) => {
          logger.info("receive " + protocol);
          // Add type to event
          evt.type = protocol;
          evt.deviceName = rfxcom.deviceNames[packetType][evt.subtype];
          let deviceId = evt.id;
          if (evt.type === "lighting4") {
            deviceId = (evt as Lighting4Event).data;
          }
          evt.group = this.isGroup(evt);
          evt.subTypeValue = this.getSubType(evt.type, evt.subtype.toString());
          callback(protocol, evt as RfxcomEvent);
        });
      });
    }
  }

  getSubType(type: string, subType: string): string {
    let returnValue = "";
    if (rfxcom.packetNames[type] !== undefined) {
      if (rfxcom[type] !== undefined) {
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
    logger.info("Disconnecting from RFXCOM");
    this.rfxtrx.close();
  }

  sendCommand(
    deviceType: string,
    subTypeValue: string,
    command: string | undefined,
    entityName: string,
  ) {
    if (command !== undefined) {
      logger.debug(
        "send rfxcom command : " +
          command +
          " for device :" +
          deviceType +
          "." +
          entityName,
      );
      const subType = this.getSubType(deviceType, subTypeValue);
      const device = new rfxcom[this.capitalize(deviceType)](
        this.rfxtrx.get(),
        subType,
      );
      device[command](entityName);
    }
  }

  private capitalize(str: string): string {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
  }
}
