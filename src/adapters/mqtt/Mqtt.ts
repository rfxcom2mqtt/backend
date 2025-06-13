import * as fs from "fs";
import * as mqtt from "mqtt";
import { QoS } from "mqtt-packet";
import { SettingMqtt, settingsService } from "../../config/settings";
import { APP_CONSTANTS } from "../../constants";
import { MQTTMessage, Topic } from "../../core/models/mqtt";
import { MqttEventListener } from "../../core/services/mqtt.service";
import { IMqtt } from "../../core/services/mqtt.service";
import { MqttConnectionError } from "../../utils/errorHandling";
import { loggerFactory } from "../../utils/logger";
import { MqttConnectionConfig, MQTTOptions } from ".";

const logger = loggerFactory.getLogger("MQTT");

/**
 * MQTT client implementation for the RFXCOM to MQTT bridge
 *
 * This class handles:
 * - Connection management to MQTT broker
 * - Publishing messages to MQTT topics
 * - Subscribing to topics and handling incoming messages
 * - SSL/TLS configuration
 * - Authentication and connection options
 */

export default class Mqtt implements IMqtt {
  private defaultOptions: mqtt.IClientPublishOptions;
  private client?: mqtt.MqttClient;
  public topics: Topic;
  private listeners: MqttEventListener[] = [];

  /**
   * Creates a new MQTT client instance
   * Initializes topics based on the configured base topic
   */
  constructor() {
    this.topics = new Topic(this.getConfig().base_topic);
    this.defaultOptions = { qos: 0, retain: false };
  }

  /**
   * Gets the current MQTT configuration from settings
   * @returns The MQTT configuration object
   */
  private getConfig(): SettingMqtt {
    return settingsService.get().mqtt;
  }

  /**
   * Adds an event listener for MQTT messages
   * @param listener - The listener to add
   */
  addListener(listener: MqttEventListener): void {
    this.listeners.push(listener);
    logger.debug(`Added MQTT listener: ${listener.constructor.name}`);
  }

  /**
   * Establishes connection to the MQTT broker
   * @returns Promise that resolves when connection is established
   */
  async connect(): Promise<void> {
    const connectionConfig = this.buildConnectionConfig();
    const options = this.buildMqttOptions(connectionConfig);

    logger.info(
      `Connecting to MQTT server at ${connectionConfig.server}:${connectionConfig.port}`,
    );

    return new Promise((resolve, reject) => {
      const connectionUrl = `${connectionConfig.server}:${connectionConfig.port}`;
      this.client = mqtt.connect(connectionUrl, options);

      this.setupConnectionHandlers(resolve, reject);
    });
  }

  /**
   * Builds the connection configuration from settings
   * @returns The connection configuration object
   */
  private buildConnectionConfig(): MqttConnectionConfig {
    const config = this.getConfig();
    return {
      server: config.server,
      port: config.port || APP_CONSTANTS.DEFAULT_MQTT_PORT,
      username: config.username,
      password: config.password,
      qos: config.qos || APP_CONSTANTS.DEFAULT_QOS,
      retain: config.retain,
      version: config.version,
      keepalive: config.keepalive,
      ca: config.ca,
      key: config.key,
      cert: config.cert,
      client_id: config.client_id,
    };
  }

  /**
   * Builds MQTT client options from connection configuration
   * @param config - The connection configuration
   * @returns The MQTT client options
   */
  private buildMqttOptions(config: MqttConnectionConfig): mqtt.IClientOptions {
    // Set default publish options
    this.defaultOptions = {
      qos: config.qos as QoS,
      retain: config.retain,
    };

    const will = this.createWillMessage();
    const options: mqtt.IClientOptions = {
      username: undefined,
      password: undefined,
      will: will,
    };

    this.configureAuthentication(options, config);
    this.configureProtocolOptions(options, config);
    this.configureSslOptions(options, config);

    return options;
  }

  /**
   * Creates the Last Will and Testament message
   * This message is published when the client disconnects unexpectedly
   * @returns The will message configuration
   */
  private createWillMessage(): mqtt.IClientOptions["will"] {
    return {
      topic: `${this.topics.base}/${this.topics.will}`,
      payload: Buffer.from("offline", "utf8"),
      qos: 1 as QoS,
      retain: true,
      properties: undefined,
    };
  }

  /**
   * Configures authentication options for MQTT connection
   * @param options - The MQTT client options to configure
   * @param config - The connection configuration
   */
  private configureAuthentication(
    options: mqtt.IClientOptions,
    config: MqttConnectionConfig,
  ): void {
    if (config.username) {
      options.username = config.username;
      options.password = config.password;
      logger.debug(`Using MQTT authentication for user: ${config.username}`);
    } else {
      logger.debug("Using MQTT anonymous login");
    }
  }

  /**
   * Configures protocol-specific options for MQTT connection
   * @param options - The MQTT client options to configure
   * @param config - The connection configuration
   */
  private configureProtocolOptions(
    options: mqtt.IClientOptions,
    config: MqttConnectionConfig,
  ): void {
    if (config.version && [3, 4, 5].includes(config.version)) {
      options.protocolVersion = config.version as 3 | 4 | 5;
      logger.debug(`Using MQTT protocol version: ${config.version}`);
    }

    if (config.keepalive) {
      logger.debug(`Using MQTT keepalive: ${config.keepalive} seconds`);
      options.keepalive = config.keepalive;
    }

    if (config.client_id) {
      logger.debug(`Using MQTT client ID: '${config.client_id}'`);
      options.clientId = config.client_id;
    }
  }

  /**
   * Configures SSL/TLS options for secure MQTT connection
   * @param options - The MQTT client options to configure
   * @param config - The connection configuration
   */
  private configureSslOptions(
    options: mqtt.IClientOptions,
    config: MqttConnectionConfig,
  ): void {
    if (config.ca) {
      logger.debug(`MQTT SSL/TLS: Loading CA certificate from ${config.ca}`);
      try {
        options.ca = fs.readFileSync(config.ca);
      } catch (error) {
        logger.error(`Failed to read CA certificate: ${error}`);
        throw new MqttConnectionError(
          `Failed to read CA certificate: ${error}`,
        );
      }
    }

    if (config.key && config.cert) {
      logger.debug(`MQTT SSL/TLS: Loading client certificates`);
      logger.debug(`  - Client key: ${config.key}`);
      logger.debug(`  - Client certificate: ${config.cert}`);
      try {
        options.key = fs.readFileSync(config.key);
        options.cert = fs.readFileSync(config.cert);
      } catch (error) {
        logger.error(`Failed to read SSL certificates: ${error}`);
        throw new MqttConnectionError(
          `Failed to read SSL certificates: ${error}`,
        );
      }
    }
  }

  /**
   * Sets up connection event handlers for the MQTT client
   * @param resolve - Promise resolve function
   * @param reject - Promise reject function
   */
  private setupConnectionHandlers(
    resolve: () => void,
    reject: (error: any) => void,
  ): void {
    this.client?.on("connect", async () => {
      logger.info("Successfully connected to MQTT broker");
      this.subscribeToListenerTopics();
      this.publishState("online");
      this.setupMessageHandler();
      resolve();
    });

    this.client?.on("error", (err: any) => {
      logger.error(`MQTT connection error: ${err.message}`);
      reject(new MqttConnectionError(`MQTT connection failed: ${err.message}`));
    });

    this.client?.on("disconnect", () => {
      logger.warn("MQTT client disconnected");
    });

    this.client?.on("reconnect", () => {
      logger.info("MQTT client attempting to reconnect");
    });
  }

  /**
   * Subscribes to topics for all registered listeners
   */
  private subscribeToListenerTopics(): void {
    this.listeners.forEach((listener) => {
      const topics = listener.subscribeTopic();
      this.subscribeToTopics(topics);
    });
  }

  /**
   * Sets up the message handler for incoming MQTT messages
   */
  private setupMessageHandler(): void {
    this.client?.on("message", (topic: string, message: Buffer) => {
      const messageStr = message.toString();
      logger.debug(
        `Received MQTT message on '${topic}' with data '${messageStr}'`,
      );

      this.notifyListeners(topic, messageStr);
    });
  }

  /**
   * Notifies all relevant listeners about an incoming MQTT message
   * @param topic - The topic the message was received on
   * @param message - The message content
   */
  private notifyListeners(topic: string, message: string): void {
    this.listeners.forEach((listener) => {
      const subscribedTopics = listener.subscribeTopic();
      const isTopicMatch = subscribedTopics.some((subscribedTopic) =>
        this.isTopicMatch(topic, subscribedTopic),
      );

      if (isTopicMatch) {
        listener.onMQTTMessage({
          topic: topic,
          message: message,
        } as MQTTMessage);
      }
    });
  }

  /**
   * Checks if a topic matches a subscription pattern
   * @param topic - The actual topic
   * @param pattern - The subscription pattern (may contain wildcards)
   * @returns True if the topic matches the pattern
   */
  private isTopicMatch(topic: string, pattern: string): boolean {
    // Simple wildcard matching - replace # with regex pattern
    const regexPattern = pattern.replace("#", ".*");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(topic);
  }

  /**
   * Subscribes to MQTT topics
   * @param topics - Array of topic patterns to subscribe to
   */
  private subscribeToTopics(topics: string[]): void {
    if (!this.client) {
      logger.warn("Cannot subscribe to topics: MQTT client not available");
      return;
    }

    this.client.subscribe(topics, (error) => {
      if (error) {
        logger.error(
          `Failed to subscribe to topics ${topics.join(", ")}: ${error.message}`,
        );
      } else {
        logger.info(`Successfully subscribed to topics: ${topics.join(", ")}`);
      }
    });
  }

  /**
   * Publishes a message to an MQTT topic
   * @param topic - The topic to publish to (relative to base topic)
   * @param payload - The message payload
   * @param callback - Callback function for publish result
   * @param options - Additional publish options
   * @param base - Base topic prefix (defaults to configured base topic)
   */
  publish(
    topic: string,
    payload: any,
    callback: (error?: Error) => void,
    options: MQTTOptions = {},
    base = this.getConfig().base_topic,
  ): void {
    if (!this.client) {
      const error = new Error("MQTT client not available");
      logger.error(error.message);
      callback(error);
      return;
    }

    const actualOptions: mqtt.IClientPublishOptions = {
      ...this.defaultOptions,
      ...options,
    };

    const fullTopic = `${base}/${topic}`;

    logger.debug(
      `Publishing to MQTT topic '${fullTopic}' with payload: ${payload}`,
    );

    this.client.publish(fullTopic, payload, actualOptions, (error) => {
      if (error) {
        logger.error(
          `Failed to publish to topic '${fullTopic}': ${error.message}`,
        );
      } else {
        logger.debug(`Successfully published to topic '${fullTopic}'`);
      }
      callback(error);
    });
  }

  /**
   * Publishes the bridge state (online/offline)
   * @param state - The state to publish
   */
  publishState(state: string): void {
    this.publish(
      this.topics.will,
      state,
      (error) => {
        if (error) {
          logger.error(`Failed to publish state '${state}': ${error.message}`);
        }
      },
      {
        retain: true,
        qos: 0,
      },
    );
  }

  /**
   * Checks if the MQTT client is connected
   * @returns True if connected and not reconnecting
   */
  isConnected(): boolean {
    return (
      this.client !== undefined &&
      this.client.connected &&
      !this.client.reconnecting
    );
  }

  /**
   * Disconnects from the MQTT broker gracefully
   */
  disconnect(): void {
    if (!this.client) {
      logger.warn("Cannot disconnect: MQTT client not available");
      return;
    }

    logger.info("Disconnecting from MQTT broker");

    // Publish offline state before disconnecting
    this.publishState("offline");

    // Close the connection
    this.client.end(false, {}, () => {
      logger.info("MQTT client disconnected successfully");
    });
  }
}
