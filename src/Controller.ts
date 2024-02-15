import { SettingDevice, settingsService } from "./settings";
import Discovery from "./discovery";
import { IMqtt, getMqttInstance } from "./mqtt";
import { IRfxcom, getRfxcomInstance } from "./rfxcom";
import Server from "./server";
import { BridgeInfo, DeviceStateStore, Action } from "./models/models";
import { MQTTMessage, MqttEventListener } from "./models/mqtt";
import { RfxcomInfo } from "./models/rfxcom";
import utils from "./utils/utils";
import { logger } from "./utils/logger";
import State, { DeviceStore } from "./store/state";
import cron from "node-cron";

export default class Controller implements MqttEventListener {
  private rfxBridge?: IRfxcom;
  private mqttClient?: IMqtt;
  private discovery?: Discovery;
  private server?: Server;
  protected state?: State;
  protected device?: DeviceStore;
  protected bridgeInfo = new BridgeInfo();

  private exitCallback: (code: number, restart: boolean) => void;

  constructor(exitCallback: (code: number, restart: boolean) => void) {
    this.exitCallback = exitCallback;
    this.reload();
  }

  reload() {
    const config = settingsService.read();
    logger.info("configuration : " + JSON.stringify(config));
    this.state = new State();
    this.device = new DeviceStore();
    this.rfxBridge = getRfxcomInstance();
    this.mqttClient = getMqttInstance();
    this.discovery = new Discovery(
      this.mqttClient,
      this.rfxBridge,
      this.state,
      this.device,
    );
    this.mqttClient.addListener(this.discovery);
    this.mqttClient.addListener(this);

    if (config.frontend.enabled) {
      this.server = new Server(
        this.device,
        this.state,
        this.bridgeInfo,
        (action: Action) => this.runAction(action),
      );
    }
  }

  async runAction(action: Action) {
    if (action.type === "bridge") {
      this.runBridgeAction(action.action);
    } else if (action.type === "device") {
      this.runDeviceAction(action.deviceId, action.entityId, action.action);
    }
  }

  async runDeviceAction(deviceId: string, entityId: string, action: string) {
    const deviceState = this.device?.get(deviceId);
    if (deviceState) {
      const device = new DeviceStateStore(deviceState);
      this.discovery?.onMQTTMessage({
        topic: device.getCommandTopic(
          this.mqttClient?.topics.base + "/cmd/",
          entityId,
        ),
        message: action,
      });
    }
  }

  async runBridgeAction(action: string) {
    if (action === "restart") {
      logger.info("restart");
      await this.stop(true);
      this.reload();
      await this.start();
    } else if (action === "stop") {
      logger.info("stop");
      await this.stop(false);
    }
  }

  async startMqtt() {
    // MQTT
    try {
      await this.mqttClient?.connect();
    } catch (error: any) {
      logger.error(`MQTT failed to connect, exiting...`);
      await this.rfxBridge?.stop();
      await this.exitCallback(1, false);
    }
  }

  async start(): Promise<void> {
    logger.info("Controller Starting");
    this.device?.start();
    this.discovery?.start();
    this.server?.start();
    try {
      await this.rfxBridge?.initialise();
    } catch (error: any) {
      logger.error("Failed to start Rfxcom");
      logger.error("Exiting...");
      logger.error(error.stack);
    }

    await this.startMqtt();

    this.rfxBridge?.subscribeProtocolsEvent((type: any, evt: any) =>
      this.sendToMQTT(type, evt, settingsService.getDeviceConfig(evt.id)),
    );

    const mqttClient = this.mqttClient;
    const hass = this.discovery;
    const config = settingsService.get();
    const bridgeInfo = this.bridgeInfo;
    const version = utils.getRfxcom2MQTTVersion();
    // RFXCOM Status
    this.rfxBridge?.onStatus(function (coordinatorInfo: RfxcomInfo) {
      bridgeInfo.coordinator = coordinatorInfo;
      bridgeInfo.version = version;
      bridgeInfo.logLevel = config ? config.loglevel : "info";
      mqttClient?.publish(
        mqttClient.topics.info,
        JSON.stringify(bridgeInfo),
        (error: any) => {},
      );
      if (config?.homeassistant?.discovery) {
        hass?.publishDiscoveryToMQTT({ device: false, payload: bridgeInfo });
      }
    });

    // RFXCOM Disconnect
    this.rfxBridge?.onDisconnect(function (evt: any) {
      mqttClient?.publish("disconnected", "disconnected", (error: any) => {});
    });

    this.scheduleHealthcheck();
    logger.info("Started");
  }

  async stop(restart = false): Promise<void> {
    this.device?.stop();
    await this.discovery?.stop();
    await this.mqttClient?.disconnect();
    await this.rfxBridge?.stop();
    await this.server?.stop();
    await this.exitCallback(0, restart);
  }

  scheduleHealthcheck() {
    if (settingsService.get().healthcheck.enabled) {
      cron.schedule(settingsService.get().healthcheck.cron, () => {
        logger.debug("Healthcheck");
        const mqttClient = this.mqttClient;

        const stop = this.stop;
        this.rfxBridge?.getStatus(function (status: string) {
          mqttClient?.publishState(status);
          if (status === "offline") {
            stop();
          }
        });
      });
    }
  }

  subscribeTopic(): string[] {
    return [settingsService.get().mqtt.base_topic + "/command/#"];
  }
  // RFXCOM Transmit
  onMQTTMessage(data: MQTTMessage) {
    const dn = data.topic.split("/");
    if (dn[0] != settingsService.get().mqtt.base_topic) {
      logger.warn(
        "Topic Error, should start with " +
          settingsService.get().mqtt.base_topic,
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

      const deviceConf = settingsService
        .get()
        .devices.find((dev: SettingDevice) => dev.name === entityName);
      this.rfxBridge?.onCommand(
        deviceType,
        entityName,
        data.message,
        deviceConf,
      );
      return;
    }

    logger.warn(
      "Topic Error, should start with " +
        settingsService.get().mqtt.base_topic +
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

    if (payload.unitCode !== undefined && !this.rfxBridge?.isGroup(payload)) {
      topicEntity += "/" + payload.unitCode;
      if (deviceConf?.units) {
        deviceConf?.units.forEach((unit) => {
          if (unit.unitCode === parseInt(payload.unitCode)) {
            if (unit.name!) {
              topicEntity = unit.name;
            }
          }
        });
      }
    }

    this.mqttClient?.publish(
      this.mqttClient.topics.devices + "/" + topicEntity,
      json,
      (error: any) => {},
    );

    if (settingsService.get().homeassistant?.discovery) {
      this.discovery?.publishDiscoveryToMQTT({
        device: true,
        payload: payload,
      });
    }
  }
}

module.exports = Controller;
