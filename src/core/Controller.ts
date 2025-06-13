import cron from "node-cron";
import Discovery from "../adapters/discovery";
import { getMqttInstance } from "../adapters/mqtt";
import { getRfxcomInstance } from "../adapters/rfxcom";
import Server from "../application";
import { SettingDevice, settingsService } from "../config/settings";
import { BRIDGE_ACTIONS, DEVICE_TYPES } from "../constants";
import { logger } from "../utils/logger";
import utils from "../utils/utils";
import { BridgeInfo, DeviceStateStore, Action } from "./models";
import { MQTTMessage } from "./models/mqtt";
import { RfxcomInfo } from "./models/rfxcom";
import { IMqtt, MqttEventListener } from "./services/mqtt.service";
import IRfxcom from "./services/rfxcom.service";
import State, { DeviceStore } from "./store/state";

import {
  safeExecute,
  MqttConnectionError,
  RfxcomError,
} from "../utils/errorHandling";

export interface ExitCallback {
  (code: number, restart: boolean): void;
}

/**
 * Main Controller class that orchestrates the RFXCOM to MQTT bridge
 *
 * This class is responsible for:
 * - Managing the lifecycle of all components (RFXCOM, MQTT, Discovery, Server)
 * - Handling communication between RFXCOM and MQTT
 * - Processing bridge and device actions
 * - Managing application state and device store
 * - Handling error conditions and recovery
 * - Implementing health checks for system stability
 *
 * The Controller follows a mediator pattern, coordinating communication
 * between different components without them needing to reference each other directly.
 *
 * @example
 * ```typescript
 * const exitHandler = (code: number, restart: boolean) => {
 *   console.log(`Exiting with code ${code}, restart: ${restart}`);
 *   process.exit(code);
 * };
 *
 * const controller = new Controller(exitHandler);
 * controller.start().catch(err => {
 *   console.error('Failed to start controller:', err);
 *   process.exit(1);
 * });
 * ```
 */

export default class Controller implements MqttEventListener {
  private rfxBridge?: IRfxcom;
  private mqttClient?: IMqtt;
  private discovery?: Discovery;
  private server?: Server;
  protected state?: State;
  protected device?: DeviceStore;
  protected bridgeInfo = new BridgeInfo();

  private exitCallback: ExitCallback;

  /**
   * Creates a new Controller instance
   * @param exitCallback - Callback function to handle application exit
   */
  constructor(exitCallback: ExitCallback) {
    this.exitCallback = exitCallback;
    this.reload();
  }

  /**
   * Reloads the configuration and reinitializes all components
   * This method is called during startup and when configuration changes
   */
  reload(): void {
    const config = settingsService.read();
    logger.info(`Loading configuration: ${JSON.stringify(config)}`);

    this.initializeComponents(config);
    this.setupEventListeners();
  }

  /**
   * Initializes all core components based on configuration
   * @param config - The application configuration
   */
  private initializeComponents(config: any): void {
    // Initialize server if frontend is enabled
    if (config.frontend.enabled) {
      this.server = new Server();
    }

    // Initialize core components
    this.state = new State();
    this.device = new DeviceStore();
    this.mqttClient = getMqttInstance();
    this.rfxBridge = getRfxcomInstance();

    // Initialize discovery service
    this.discovery = new Discovery(
      this.mqttClient,
      this.rfxBridge,
      this.state,
      this.device,
    );

    // Enable API if frontend is enabled
    if (config.frontend.enabled && this.server) {
      logger.info("Enabling server API");
      this.server.enableApi(
        this.device,
        this.state,
        this.discovery,
        this.bridgeInfo,
        (action: Action) => this.runAction(action),
      );
    }
  }

  /**
   * Sets up event listeners for MQTT communication
   */
  private setupEventListeners(): void {
    if (this.mqttClient && this.discovery) {
      this.mqttClient.addListener(this.discovery);
      this.mqttClient.addListener(this);
    }
  }

  /**
   * Executes an action based on its type (bridge or device)
   * @param action - The action to execute
   * @returns A promise that resolves when the action is complete
   * @throws Will log but not throw errors to prevent cascading failures
   */
  async runAction(action: Action): Promise<void> {
    try {
      if (!action || !action.type) {
        logger.warn(
          "Invalid action received: missing type or malformed action object",
        );
        return;
      }

      logger.debug(`Processing action: ${JSON.stringify(action)}`);

      if (action.type === "bridge") {
        if (!action.action) {
          logger.warn("Bridge action missing action property");
          return;
        }
        await this.runBridgeAction(action.action);
      } else if (action.type === "device") {
        if (!action.deviceId || !action.entityId || !action.action) {
          logger.warn(
            `Device action missing required properties: ${JSON.stringify({
              deviceId: action.deviceId ? "present" : "missing",
              entityId: action.entityId ? "present" : "missing",
              action: action.action ? "present" : "missing",
            })}`,
          );
          return;
        }
        await this.runDeviceAction(
          action.deviceId,
          action.entityId,
          action.action,
        );
      } else {
        logger.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      logger.error(
        `Failed to execute action: ${error instanceof Error ? error.message : String(error)}`,
      );
      logger.debug(`Action that failed: ${JSON.stringify(action)}`);
      // We intentionally don't rethrow to prevent cascading failures
    }
  }

  /**
   * Executes a device-specific action
   * @param deviceId - The ID of the device
   * @param entityId - The entity ID within the device
   * @param action - The action to perform
   */
  async runDeviceAction(
    deviceId: string,
    entityId: string,
    action: string,
  ): Promise<void> {
    const deviceState = this.device?.get(deviceId);

    if (!deviceState) {
      logger.warn(`Device not found: ${deviceId}`);
      return;
    }

    if (!this.mqttClient) {
      logger.error("MQTT client not available for device action");
      return;
    }

    try {
      const device = new DeviceStateStore(deviceState);
      const commandTopic = device.getCommandTopic(
        this.mqttClient.topics.base + "/cmd/",
        entityId,
      );

      this.discovery?.onMQTTMessage({
        topic: commandTopic,
        message: action,
      });

      logger.debug(
        `Device action executed: ${deviceId}/${entityId} -> ${action}`,
      );
    } catch (error) {
      logger.error(
        `Failed to execute device action: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Executes a bridge-specific action
   * @param action - The action to perform on the bridge
   * @returns A promise that resolves when the action is complete
   *
   * @example
   * ```typescript
   * // Restart the bridge
   * await controller.runBridgeAction(BRIDGE_ACTIONS.RESTART);
   *
   * // Reset all devices
   * await controller.runBridgeAction(BRIDGE_ACTIONS.RESET_DEVICES);
   * ```
   */
  async runBridgeAction(action: string): Promise<void> {
    logger.info(`Executing bridge action: ${action}`);

    try {
      switch (action) {
        case BRIDGE_ACTIONS.RESTART:
          await this.restartBridge();
          logger.info("Bridge restart completed successfully");
          break;
        case BRIDGE_ACTIONS.STOP:
          await this.stop(false);
          logger.info("Bridge stop completed successfully");
          break;
        case BRIDGE_ACTIONS.RESET_DEVICES:
          this.resetDevices();
          logger.info("Device reset completed successfully");
          break;
        case BRIDGE_ACTIONS.RESET_STATE:
          this.resetState();
          logger.info("State reset completed successfully");
          break;
        default:
          logger.warn(`Unknown bridge action: ${action}`);
          logger.debug(
            `Available bridge actions: ${Object.values(BRIDGE_ACTIONS).join(", ")}`,
          );
      }
    } catch (error) {
      logger.error(
        `Failed to execute bridge action '${action}': ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        logger.debug(`Stack trace: ${error.stack}`);
      }
    }
  }

  /**
   * Restarts the RFXCOM bridge
   * This performs a full stop and start cycle of all components
   */
  private async restartBridge(): Promise<void> {
    logger.info("Restarting RFXCOM bridge");
    await this.stop(true);
    this.reload();
    await this.start();
  }

  /**
   * Resets all device states to their default values
   * This clears any cached device information
   */
  private resetDevices(): void {
    logger.info("Resetting all devices");
    this.device?.reset();
    logger.info("Devices reset completed");
  }

  /**
   * Resets the application state to its default values
   * This clears any cached state information
   */
  private resetState(): void {
    logger.info("Resetting application state");
    this.state?.reset();
    logger.info("State reset completed");
  }

  /**
   * Initializes and connects to the MQTT broker
   * Uses safe execution to handle connection errors gracefully
   *
   * @throws Will exit the application if MQTT connection fails
   */
  private async startMqtt(): Promise<void> {
    logger.info("Connecting to MQTT broker");

    await safeExecute(
      async () => {
        if (!this.mqttClient) {
          throw new MqttConnectionError("MQTT client not initialized");
        }
        await this.mqttClient.connect();
        logger.info("Successfully connected to MQTT broker");
      },
      "Failed to connect to MQTT broker",
      { component: "MQTT" },
    ).catch(async (error) => {
      logger.error(`MQTT connection failed: ${error.message}`);
      logger.info("Stopping RFXCOM bridge due to MQTT connection failure");
      await this.rfxBridge?.stop();
      await this.exitCallback(1, false);
    });
  }

  /**
   * Starts all components of the RFXCOM to MQTT bridge
   * This includes the server, device store, discovery service, RFXCOM bridge, and MQTT client
   */
  async start(): Promise<void> {
    logger.info("Controller starting");

    try {
      await this.startComponents();
      await this.initializeRfxcomBridge();
      await this.startMqtt();
      this.setupRfxcomEventHandlers();
      this.scheduleHealthcheck();

      logger.info("Controller started successfully");
    } catch (error) {
      logger.error(
        `Failed to start controller: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Starts the core components (server, device store, discovery)
   */
  private async startComponents(): Promise<void> {
    this.server?.start();
    this.device?.start();
    this.discovery?.start();
  }

  /**
   * Initializes the RFXCOM bridge with error handling
   */
  private async initializeRfxcomBridge(): Promise<void> {
    await safeExecute(
      async () => {
        if (!this.rfxBridge) {
          throw new RfxcomError("RFXCOM bridge not initialized");
        }
        await this.rfxBridge.initialise();
      },
      "Failed to initialize RFXCOM bridge",
      { component: "RFXCOM" },
    );
  }

  /**
   * Sets up event handlers for RFXCOM bridge events
   */
  private setupRfxcomEventHandlers(): void {
    if (!this.rfxBridge) {
      logger.warn("RFXCOM bridge not available for event handler setup");
      return;
    }

    // Subscribe to protocol events
    this.rfxBridge.subscribeProtocolsEvent((type: any, evt: any) =>
      this.sendToMQTT(type, evt),
    );

    // Handle status updates
    this.rfxBridge.onStatus((coordinatorInfo: RfxcomInfo) => {
      this.handleRfxcomStatus(coordinatorInfo);
    });

    // Handle disconnection events
    this.rfxBridge.onDisconnect((evt: any) => {
      this.handleRfxcomDisconnect(evt);
    });
  }

  /**
   * Handles RFXCOM status updates
   * @param coordinatorInfo - Information about the RFXCOM coordinator
   */
  private handleRfxcomStatus(coordinatorInfo: RfxcomInfo): void {
    const config = settingsService.get();
    const version = utils.getRfxcom2MQTTVersion();

    this.bridgeInfo.coordinator = coordinatorInfo;
    this.bridgeInfo.version = version;
    this.bridgeInfo.logLevel = config ? config.loglevel : "info";

    // Publish bridge info to MQTT
    this.mqttClient?.publish(
      this.mqttClient.topics.info,
      JSON.stringify(this.bridgeInfo),
      (error: any) => {
        if (error) {
          logger.error(`Failed to publish bridge info: ${error.message}`);
        }
      },
    );

    // Publish to Home Assistant discovery if enabled
    if (config?.homeassistant?.discovery) {
      this.discovery?.publishDiscoveryToMQTT({
        device: false,
        payload: this.bridgeInfo,
      });
    }
  }

  /**
   * Handles RFXCOM disconnection events
   * @param evt - The disconnection event
   */
  private handleRfxcomDisconnect(evt: any): void {
    logger.warn("RFXCOM disconnected");
    this.mqttClient?.publish("disconnected", "disconnected", (error: any) => {
      if (error) {
        logger.error(
          `Failed to publish disconnection status: ${error.message}`,
        );
      }
    });
  }

  /**
   * Stops all components gracefully
   * @param restart - Whether the application should restart after stopping
   */
  async stop(restart = false): Promise<void> {
    logger.info(`Stopping controller (restart: ${restart})`);

    try {
      this.device?.stop();
      await this.discovery?.stop();
      await this.mqttClient?.disconnect();
      await this.rfxBridge?.stop();
      await this.server?.stop();

      logger.info("Controller stopped successfully");
      await this.exitCallback(0, restart);
    } catch (error) {
      logger.error(
        `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.exitCallback(1, restart);
    }
  }

  /**
   * Schedules periodic health checks if enabled in configuration
   */
  private scheduleHealthcheck(): void {
    const config = settingsService.get();

    if (!config.healthcheck.enabled) {
      logger.debug("Health check disabled");
      return;
    }

    logger.info(
      `Scheduling health check with cron: ${config.healthcheck.cron}`,
    );

    cron.schedule(config.healthcheck.cron, () => {
      this.performHealthcheck();
    });
  }

  /**
   * Performs a health check by querying RFXCOM status
   */
  private performHealthcheck(): void {
    logger.debug("Performing health check");

    this.rfxBridge?.getStatus((status: string) => {
      this.mqttClient?.publishState(status);

      if (status === "offline") {
        logger.error("Health check failed: RFXCOM is offline");
        this.stop();
      } else {
        logger.debug(`Health check passed: RFXCOM status is ${status}`);
      }
    });
  }

  /**
   * Returns the MQTT topics this controller subscribes to
   * @returns Array of topic patterns to subscribe to
   */
  subscribeTopic(): string[] {
    const baseTopic = settingsService.get().mqtt.base_topic;
    return [`${baseTopic}/command/#`];
  }

  /**
   * Handles incoming MQTT messages and routes them to RFXCOM
   * @param data - The MQTT message data
   */
  onMQTTMessage(data: MQTTMessage): void {
    try {
      const topicParts = data.topic.split("/");
      const baseTopic = settingsService.get().mqtt.base_topic;

      if (!this.validateTopicStructure(topicParts, baseTopic)) {
        return;
      }

      if (topicParts[1] === "command") {
        this.handleCommandMessage(topicParts, data.message);
      } else {
        logger.warn(
          `Invalid topic structure: expected 'command' but got '${topicParts[1]}'`,
        );
      }
    } catch (error) {
      logger.error(
        `Error processing MQTT message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validates the structure of an incoming MQTT topic
   * @param topicParts - The topic split into parts
   * @param baseTopic - The expected base topic
   * @returns True if the topic structure is valid
   */
  private validateTopicStructure(
    topicParts: string[],
    baseTopic: string,
  ): boolean {
    if (topicParts[0] !== baseTopic) {
      logger.warn(
        `Invalid topic base: expected '${baseTopic}' but got '${topicParts[0]}'`,
      );
      return false;
    }
    return true;
  }

  /**
   * Handles command messages from MQTT
   * @param topicParts - The topic split into parts
   * @param message - The message content
   */
  private handleCommandMessage(topicParts: string[], message: string): void {
    const deviceType = topicParts[2];
    let entityName = topicParts[3];

    // Handle unit codes in the entity name
    if (topicParts[4] !== undefined && topicParts[4].length > 0) {
      entityName += "/" + topicParts[4];
    }

    // Find device configuration
    const deviceConf = settingsService
      .get()
      .devices.find((dev: SettingDevice) => dev.name === entityName);

    // Send command to RFXCOM bridge
    this.rfxBridge?.onCommand(deviceType, entityName, message, deviceConf);

    logger.debug(
      `Command sent to RFXCOM: ${deviceType}/${entityName} -> ${message}`,
    );
  }

  /**
   * Processes RFXCOM events and sends them to MQTT
   * This is the core bridge functionality that forwards RFXCOM events to MQTT topics
   *
   * @param type - The type of RFXCOM event
   * @param evt - The event data from RFXCOM
   */
  private sendToMQTT(type: string, evt: any): void {
    if (!evt) {
      logger.warn(`Received empty RFXCOM event of type ${type}`);
      return;
    }

    logger.info(`Received RFXCOM event type ${type}: ${JSON.stringify(evt)}`);

    try {
      // Process the event data
      const processedEvent = this.processRfxcomEvent(type, evt);
      if (!processedEvent.id) {
        logger.warn(
          `RFXCOM event missing ID, cannot publish to MQTT: ${JSON.stringify(processedEvent)}`,
        );
        return;
      }

      // Build the topic entity and payload
      const topicEntity = this.buildTopicEntity(processedEvent);
      const payload = JSON.stringify(processedEvent, null, 2);

      // Publish to MQTT and handle discovery
      this.publishToMqttTopic(topicEntity, payload);
      this.handleHomeAssistantDiscovery(processedEvent);

      logger.debug(
        `Successfully processed RFXCOM event: ${type} for entity ${topicEntity}`,
      );
    } catch (error) {
      logger.error(
        `Failed to process RFXCOM event: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        logger.debug(`Stack trace: ${error.stack}`);
      }
      logger.debug(
        `Event that failed: ${JSON.stringify({ type, event: evt })}`,
      );
    }
  }

  /**
   * Processes a raw RFXCOM event into a standardized format
   * @param type - The type of RFXCOM event
   * @param evt - The raw event data from RFXCOM
   * @returns The processed event with additional metadata
   */
  private processRfxcomEvent(type: string, evt: any): any {
    // Create a copy and add type information
    const processedEvent = { ...evt, type };

    // Handle special device types
    if (type === DEVICE_TYPES.LIGHTING4) {
      processedEvent.id = evt.data;
    }

    return processedEvent;
  }

  /**
   * Builds the MQTT topic entity part from an event
   * @param event - The processed RFXCOM event
   * @returns The topic entity string to use in MQTT topics
   */
  private buildTopicEntity(event: any): string {
    let topicEntity = event.id;

    // Add unit code to topic if present and not a group command
    if (event.unitCode !== undefined && !event.group) {
      topicEntity += `/${event.unitCode}`;
    }

    return topicEntity;
  }

  /**
   * Publishes a message to an MQTT topic
   * @param topicEntity - The entity part of the topic
   * @param payload - The message payload to publish
   */
  private publishToMqttTopic(topicEntity: string, payload: string): void {
    if (!this.mqttClient) {
      logger.warn("MQTT client not available, cannot publish message");
      return;
    }

    const fullTopic = `${this.mqttClient.topics.devices}/${topicEntity}`;

    this.mqttClient.publish(fullTopic, payload, (error: any) => {
      if (error) {
        logger.error(
          `Failed to publish to MQTT topic ${fullTopic}: ${error.message}`,
        );
      } else {
        logger.debug(`Successfully published to MQTT topic: ${fullTopic}`);
      }
    });
  }

  /**
   * Handles Home Assistant discovery for a device
   * Publishes device information to Home Assistant discovery topics if enabled
   *
   * @param payload - The device payload to publish for discovery
   */
  private handleHomeAssistantDiscovery(payload: any): void {
    const config = settingsService.get();

    if (!config?.homeassistant?.discovery) {
      logger.debug("Home Assistant discovery disabled, skipping");
      return;
    }

    if (!this.discovery) {
      logger.warn(
        "Discovery service not available, cannot publish to Home Assistant",
      );
      return;
    }

    this.discovery.publishDiscoveryToMQTT({
      device: true,
      payload: payload,
    });

    logger.debug(
      `Published discovery information for device: ${payload.id || "unknown"}`,
    );
  }
}

module.exports = Controller;
