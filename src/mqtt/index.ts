import * as mqtt from "mqtt";
import { IConnectPacket, QoS } from "mqtt-packet";
import { SettingMqtt, settingsService } from "../settings";
import { MqttEventListener, MQTTMessage } from "../models/mqtt";
import fs from "fs";
import { loggerFactory } from "../utils/logger";
const logger = loggerFactory.getLogger("MQTT");

interface MQTTOptions {
  qos?: QoS;
  retain?: boolean;
}

class Topic {
  base: string;
  will: string;
  devices: string;
  info: string;

  constructor(baseTopic: string) {
    this.base = baseTopic;
    this.devices = "devices";
    this.will = "bridge/status";
    this.info = "bridge/info";
  }
}

export interface IMqtt {
  topics: Topic;
  addListener(listener: MqttEventListener);
  publish(
    topic: string,
    playload: any,
    callback: any,
    options: MQTTOptions,
    base,
  ): void;
  publish(
    topic: string,
    playload: any,
    callback: any,
    options: MQTTOptions,
  ): void;
  publish(topic: string, playload: any, callback: any): void;
  publishState(state: string);
  connect(): Promise<void>;
  isConnected(): boolean;
  disconnect();
}

export class MockMqtt implements IMqtt {
  public topics: Topic;

  constructor() {
    this.topics = new Topic(settingsService.get().mqtt.base_topic);
  }
  async connect(): Promise<void> {}
  isConnected(): boolean {
    return true;
  }
  disconnect() {}

  addListener(listener: MqttEventListener) {}
  publishState(state: string) {}
  publish(
    topic: string,
    playload: any,
    callback: any,
    options: MQTTOptions = {},
    base = settingsService.get().mqtt.base_topic,
  ): void {}
}

export function getMqttInstance(): IMqtt {
  return settingsService.get().mqtt.server === "mock"
    ? new MockMqtt()
    : new Mqtt();
}

export default class Mqtt implements IMqtt {
  private defaultOptions: any;
  private client?: mqtt.MqttClient;
  public topics: Topic;
  private listeners: MqttEventListener[] = [];

  constructor() {
    this.topics = new Topic(this.getConfig().base_topic);
  }

  private getConfig(): SettingMqtt {
    return settingsService.get().mqtt;
  }

  addListener(listener: MqttEventListener) {
    this.listeners.push(listener);
  }

  async connect(): Promise<void> {
    let port = "1883";
    if (this.getConfig().port) {
      port = this.getConfig().port!!;
    }

    let qos = 0 as QoS;
    if (this.getConfig().qos) {
      qos = this.getConfig().qos as QoS;
    }

    this.defaultOptions = { qos: qos, retain: this.getConfig().retain };
    logger.info(`Connecting to MQTT server at ${this.getConfig().server}`);
    const will = {
      topic: this.topics.base + "/" + this.topics.will,
      payload: Buffer.from("offline", "utf8"),
      qos: 1 as QoS,
      retain: true,
      properties: undefined,
    };

    const options: mqtt.IClientOptions = {
      username: undefined,
      password: undefined,
      will: will,
    };
    if (this.getConfig().username) {
      options.username = this.getConfig().username;
      options.password = this.getConfig().password;
    } else {
      logger.debug(`Using MQTT anonymous login`);
    }

    if (this.getConfig().version) {
      options.protocolVersion = this.getConfig().version;
    }

    if (this.getConfig().keepalive) {
      logger.debug(`Using MQTT keepalive: ${this.getConfig().keepalive}`);
      options.keepalive = this.getConfig().keepalive;
    }

    if (this.getConfig().ca) {
      logger.debug(
        `MQTT SSL/TLS: Path to CA certificate = ${this.getConfig().ca}`,
      );
      options.ca = fs.readFileSync(this.getConfig().ca!!);
    }

    if (this.getConfig().key && this.getConfig().cert) {
      logger.debug(
        `MQTT SSL/TLS: Path to client key = ${this.getConfig().key}`,
      );
      logger.debug(
        `MQTT SSL/TLS: Path to client certificate = ${this.getConfig().cert}`,
      );
      options.key = fs.readFileSync(this.getConfig().key!!);
      options.cert = fs.readFileSync(this.getConfig().cert!!);
    }

    if (this.getConfig().client_id) {
      logger.debug(`Using MQTT client ID: '${this.getConfig().client_id}'`);
      options.clientId = this.getConfig().client_id;
    }

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.getConfig().server + ":" + port, options);

      // MQTT Connect
      this.onConnect(async () => {
        logger.info("Connected to MQTT");
        this.listeners.forEach((listener) => {
          this.subscribe(listener.subscribeTopic());
        });
        this.publishState("online");
        this.onMessage();
        resolve();
      });

      this.client.on("error", (err: any) => {
        logger.error(err);
        reject(err);
      });
    });
  }

  private onMessage(): void {
    this.client?.on("message", (topic: string, message: any) => {
      logger.debug(
        `Received MQTT message on '${topic}' with data '${message.toString()}'`,
      );
      this.listeners.forEach((listener) => {
        if (
          listener
            .subscribeTopic()
            .find((e) => topic.includes(e.replace("#", "")))
        ) {
          listener.onMQTTMessage({
            topic: topic,
            message: message.toString(),
          } as MQTTMessage);
        }
      });
    });
  }

  private onConnect(callback: any): void {
    this.client?.on("connect", callback);
  }

  private subscribe(topics: any): void {
    this.client?.subscribe(topics, () => {
      logger.info(`Subscribing to topics '${topics}'`);
    });
  }

  publish(
    topic: string,
    playload: any,
    callback: any,
    options: MQTTOptions = {},
    base = this.getConfig().base_topic,
  ): void {
    const actualOptions: mqtt.IClientPublishOptions = {
      ...this.defaultOptions,
      ...options,
    };
    topic = `${base}/${topic}`;
    logger.debug(
      "MQTT publish: topic " + topic + ", payload '" + playload + "'",
    );
    this.client?.publish(topic, playload, actualOptions, (error: any) => {
      if (error) {
        logger.error(error);
      }
      callback(error);
    });
  }

  publishState(state: string) {
    this.publish(this.topics.will, state, (error: any) => {}, {
      retain: true,
      qos: 0,
    });
  }

  isConnected(): boolean {
    return this.client !== undefined && !this.client?.reconnecting;
  }

  disconnect() {
    this.publishState("offline");
    logger.info("Disconnecting from MQTT server");
    this.client?.end();
  }
}
