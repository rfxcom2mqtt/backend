import { Settings, SettingDevice, settingsService } from "../settings";
import Discovery from "../discovery";
import Mqtt from "../mqtt";
import Server from "../api";
import Rfxcom from "../rfxcom";
import IRfxcom from "../rfxcom/interface";
import MockRfxcom from "../rfxcom/Mock";
import { BridgeInfo } from "../models/models";
import { MQTTMessage, MqttEventListener } from "../models/mqtt";
import { RfxcomInfo } from "../models/rfxcom";
import utils from "./utils";
import { logger } from "./logger";
import State, { DeviceStore } from "../store/state";

import cron from "node-cron";

export default class Controller implements MqttEventListener {
  private config: Settings;
  private rfxBridge: IRfxcom;
  private mqttClient: Mqtt;
  private discovery: Discovery;
  private server?: Server;
  protected state: State;
  protected device: DeviceStore;
  protected bridgeInfo = new BridgeInfo();

  private exitCallback: (code: number, restart: boolean) => void;

  constructor(exitCallback: (code: number, restart: boolean) => void) {
    this.exitCallback = exitCallback;

    this.config = settingsService.read();
    this.state = new State(this.config);
    this.device = new DeviceStore(this.config);
    logger.info("configuration : " + JSON.stringify(this.config));
    this.rfxBridge = this.config.mock
      ? new MockRfxcom(this.config.rfxcom)
      : new Rfxcom(this.config.rfxcom);
    this.mqttClient = new Mqtt(this.config);
    this.discovery = new Discovery(
      this.mqttClient,
      this.rfxBridge,
      this.config,
      this.state,
      this.device,
    );
    this.mqttClient.addListener(this.discovery);
    this.mqttClient.addListener(this);

    if (this.config.frontend.enabled) {
      this.server = new Server(
        this.config,
        this.device,
        this.state,
        this.bridgeInfo,
      );
    }
  }

  async startMqtt() {
    // MQTT
    try {
      await this.mqttClient.connect();
    } catch (error: any) {
      logger.error(`MQTT failed to connect, exiting...`);
      await this.rfxBridge.stop();
      await this.exitCallback(1, false);
    }
  }

  async start(): Promise<void> {
    logger.info("Controller Starting");
    this.device.start();
    this.discovery.start();
    this.server?.start();
    try {
      await this.rfxBridge.initialise();
    } catch (error: any) {
      logger.error("Failed to start Rfxcom");
      logger.error("Exiting...");
      logger.error(error.stack);
    }

    await this.startMqtt();

    this.rfxBridge.subscribeProtocolsEvent(
      (type: any, evt: any, deviceConf: any) =>
        this.sendToMQTT(type, evt, deviceConf),
    );

    const mqttClient = this.mqttClient;
    const hass = this.discovery;
    const config = this.config;
    const bridgeInfo = this.bridgeInfo;
    const version = utils.getRfxcom2MQTTVersion();
    // RFXCOM Status
    this.rfxBridge.onStatus(function (coordinatorInfo: RfxcomInfo) {
      bridgeInfo.coordinator = coordinatorInfo;
      bridgeInfo.version = version;
      bridgeInfo.logLevel = config.loglevel;
      mqttClient.publish(
        mqttClient.topics.info,
        JSON.stringify(bridgeInfo),
        (error: any) => {},
      );
      if (config.homeassistant?.discovery) {
        hass.publishDiscoveryToMQTT({ device: false, payload: bridgeInfo });
      }
    });

    // RFXCOM Disconnect
    this.rfxBridge.onDisconnect(function (evt: any) {
      mqttClient.publish("disconnected", "disconnected", (error: any) => {});
    });

    this.scheduleHealthcheck();
    logger.info("Started");
  }

  async stop(restart = false): Promise<void> {
    await this.discovery.stop();
    await this.mqttClient.disconnect();
    await this.rfxBridge.stop();
    await this.exitCallback(0, restart);
    await this.server?.stop();
    this.device.stop();
  }

  scheduleHealthcheck() {
    if (this.config.healthcheck.enabled) {
      cron.schedule(this.config.healthcheck.cron, () => {
        logger.debug("Healthcheck");
        const mqttClient = this.mqttClient;

        const stop = this.stop;
        this.rfxBridge.getStatus(function (status: string) {
          mqttClient.publishState(status);
          if (status === "offline") {
            stop();
          }
        });
      });
    }
  }

  subscribeTopic(): string[] {
    return [this.config.mqtt.base_topic + "/command/#"];
  }
  // RFXCOM Transmit
  onMQTTMessage(data: MQTTMessage) {
    const dn = data.topic.split("/");
    if (dn[0] != this.config.mqtt.base_topic) {
      logger.warn(
        "Topic Error, should start with " + this.config.mqtt.base_topic,
      );
      return;
    }

    if (dn[1] === "command") {
      const deviceType = dn[2];
      let entityName = dn[3];
      // Used for units and forms part of the device id
      if (dn[4] !== undefined && dn[4].length > 0) {
        entityName += "/" + dn[4];
      }
      this.rfxBridge.onCommand(deviceType, entityName, data.message);
      return;
    }

    logger.warn(
      "Topic Error, should start with " +
        this.config.mqtt.base_topic +
        "/command",
    );
    return;
  }

  sendToMQTT(type: any, evt: any, deviceConf?: SettingDevice) {
    logger.info("receive from rfxcom : " + JSON.stringify(evt));
    // Add type to event!
    evt.type = type;

    let deviceId = evt.id;
    if (type === "lighting4") {
      deviceId = evt.data;
    }

    // Define default topic entity
    let topicEntity = deviceId;

    // Get device config if available
    if (deviceConf?.name !== undefined) {
      topicEntity = deviceConf.name;
    }

    const json = JSON.stringify(evt, null, 2);
    const payload = JSON.parse(json);

    if (payload.unitCode !== undefined && !this.rfxBridge.isGroup(payload)) {
      topicEntity += "/" + payload.unitCode;
      if (deviceConf?.units) {
        deviceConf?.units.forEach((unit) => {
          if (parseInt(unit.unitCode) === parseInt(payload.unitCode)) {
            if (unit.name!) {
              topicEntity = unit.name;
            }
          }
        });
      }
    }

    this.mqttClient.publish(
      this.mqttClient.topics.devices + "/" + topicEntity,
      json,
      (error: any) => {},
    );

    if (this.config.homeassistant?.discovery) {
      this.discovery.publishDiscoveryToMQTT({ device: true, payload: payload });
    }
  }
}
