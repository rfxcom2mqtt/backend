import * as mqtt from "mqtt";
import Mqtt from "../../adapters/mqtt/Mqtt";
import { settingsService } from "../../config/settings";
import { MQTTMessage } from "../../core/models/mqtt";
import { MqttConnectionError } from "../../utils/errorHandling";

// Mock the mqtt library
jest.mock("mqtt", () => ({
  connect: jest.fn(),
}));

// Mock the fs module for SSL certificate reading
jest.mock("fs", () => ({
  readFileSync: jest
    .fn()
    .mockImplementation((path) => Buffer.from(`mock content for ${path}`)),
}));

// Mock the settings service
jest.mock("../../config/settings", () => ({
  settingsService: {
    get: jest.fn().mockReturnValue({
      mqtt: {
        base_topic: "rfxcom",
        server: "mqtt://localhost",
        port: 1883,
        username: "testuser",
        password: "testpass",
        qos: 1,
        retain: true,
        client_id: "test-client",
      },
    }),
  },
}));

// Mock the logger
jest.mock("../../utils/logger", () => ({
  loggerFactory: {
    getLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe("Mqtt", () => {
  let mqttClient: Mqtt;
  let mockMqttClient: any;
  let connectCallback: Function;
  let errorCallback: Function;
  let messageCallback: Function;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize the mock client before creating the Mqtt instance
    mockMqttClient = {
      on: jest.fn(),
      subscribe: jest.fn(),
      publish: jest.fn(),
      end: jest.fn(),
      connected: true,
      reconnecting: false,
    };

    // Make sure connect returns our mockMqttClient
    (mqtt.connect as jest.Mock).mockReturnValue(mockMqttClient);

    // Now create the Mqtt instance
    mqttClient = new Mqtt();

    // Set up the mock implementation for on() to capture callbacks
    mockMqttClient.on.mockImplementation(
      (event: string, callback: Function) => {
        if (event === "connect") connectCallback = callback;
        if (event === "error") errorCallback = callback;
        if (event === "message") messageCallback = callback;
        return mockMqttClient;
      },
    );
  });

  describe("constructor", () => {
    it("should initialize with the correct topic from settings", () => {
      expect(mqttClient.topics.base).toBe("rfxcom");
    });
  });

  describe("connect", () => {
    it("should connect to the MQTT broker with the correct options", async () => {
      // Arrange
      const connectPromise = mqttClient.connect();

      // Act
      if (connectCallback) connectCallback();

      // Assert
      await expect(connectPromise).resolves.toBeUndefined();
      expect(mqtt.connect).toHaveBeenCalledWith(
        "mqtt://localhost:1883",
        expect.objectContaining({
          username: "testuser",
          password: "testpass",
          will: expect.objectContaining({
            topic: "rfxcom/bridge/status",
            payload: expect.any(Buffer),
            qos: 1,
            retain: true,
          }),
        }),
      );
    });

    it("should reject with MqttConnectionError when connection fails", async () => {
      // Arrange
      const connectPromise = mqttClient.connect();

      // Act
      if (errorCallback) errorCallback(new Error("Connection failed"));

      // Assert
      await expect(connectPromise).rejects.toThrow(MqttConnectionError);
      await expect(connectPromise).rejects.toThrow(
        "MQTT connection failed: Connection failed",
      );
    });
  });

  describe("isConnected", () => {
    it("should return true when client is connected and not reconnecting", () => {
      // Arrange
      mqttClient.connect();

      // Assert
      expect(mqttClient.isConnected()).toBe(true);
    });

    it("should return false when client is reconnecting", () => {
      // Arrange
      mqttClient.connect();
      mockMqttClient.reconnecting = true;

      // Assert
      expect(mqttClient.isConnected()).toBe(false);
    });

    it("should return false when client is not connected", () => {
      // Arrange
      mqttClient.connect();
      mockMqttClient.connected = false;

      // Assert
      expect(mqttClient.isConnected()).toBe(false);
    });
  });

  describe("publish", () => {
    beforeEach(async () => {
      const connectPromise = mqttClient.connect();
      if (connectCallback) connectCallback();
      await connectPromise;
    });

    it("should publish a message to the correct topic", () => {
      // Arrange
      const callback = jest.fn();
      mockMqttClient.publish.mockImplementation(
        (topic, payload, options, cb) => {
          cb();
        },
      );

      // Act
      mqttClient.publish("test/topic", "test message", callback);

      // Assert
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        "rfxcom/test/topic",
        "test message",
        expect.objectContaining({ qos: 1, retain: true }),
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalled();
    });

    it("should handle publish errors", () => {
      // Arrange
      const callback = jest.fn();
      const error = new Error("Publish failed");
      mockMqttClient.publish.mockImplementation(
        (topic, payload, options, cb) => {
          cb(error);
        },
      );

      // Act
      mqttClient.publish("test/topic", "test message", callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(error);
    });

    it("should call callback with error when client is not available", () => {
      // Arrange
      const callback = jest.fn();
      // Force client to be undefined
      Object.defineProperty(mqttClient, "client", { value: undefined });

      // Act
      mqttClient.publish("test/topic", "test message", callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
      expect(callback.mock.calls[0][0].message).toBe(
        "MQTT client not available",
      );
    });
  });

  describe("publishState", () => {
    beforeEach(async () => {
      const connectPromise = mqttClient.connect();
      if (connectCallback) connectCallback();
      await connectPromise;
    });

    it("should publish the state to the will topic", () => {
      // Arrange
      mockMqttClient.publish.mockImplementation(
        (topic, payload, options, cb) => {
          cb();
        },
      );

      // Act
      mqttClient.publishState("online");

      // Assert
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        "rfxcom/bridge/status",
        "online",
        expect.objectContaining({ retain: true }),
        expect.any(Function),
      );
    });
  });

  describe("addListener", () => {
    it("should add a listener to the listeners array", async () => {
      // Arrange
      const listener = {
        subscribeTopic: jest.fn().mockReturnValue(["test/topic"]),
        onMQTTMessage: jest.fn(),
      };

      // Act
      mqttClient.addListener(listener);

      // Connect to trigger subscription
      const connectPromise = mqttClient.connect();
      if (connectCallback) connectCallback();
      await connectPromise;

      // Assert
      expect(listener.subscribeTopic).toHaveBeenCalled();
      expect(mockMqttClient.subscribe).toHaveBeenCalledWith(
        ["test/topic"],
        expect.any(Function),
      );
    });

    it("should notify listeners when a message is received on a subscribed topic", async () => {
      // Arrange
      const listener = {
        subscribeTopic: jest.fn().mockReturnValue(["test/topic"]),
        onMQTTMessage: jest.fn(),
      };
      mqttClient.addListener(listener);

      // Connect to set up message handler
      const connectPromise = mqttClient.connect();
      if (connectCallback) connectCallback();
      await connectPromise;

      // Act - simulate receiving a message
      if (messageCallback)
        messageCallback("test/topic", Buffer.from("test message"));

      // Assert
      expect(listener.onMQTTMessage).toHaveBeenCalledWith({
        topic: "test/topic",
        message: "test message",
      } as MQTTMessage);
    });

    it("should not notify listeners for unsubscribed topics", async () => {
      // Arrange
      const listener = {
        subscribeTopic: jest.fn().mockReturnValue(["subscribed/topic"]),
        onMQTTMessage: jest.fn(),
      };
      mqttClient.addListener(listener);

      // Connect to set up message handler
      const connectPromise = mqttClient.connect();
      if (connectCallback) connectCallback();
      await connectPromise;

      // Act - simulate receiving a message on a different topic
      if (messageCallback)
        messageCallback("unsubscribed/topic", Buffer.from("test message"));

      // Assert
      expect(listener.onMQTTMessage).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    beforeEach(async () => {
      const connectPromise = mqttClient.connect();
      if (connectCallback) connectCallback();
      await connectPromise;
    });

    it("should publish offline state and end the client connection", () => {
      // Arrange
      mockMqttClient.publish.mockImplementation(
        (topic, payload, options, cb) => {
          cb();
        },
      );
      mockMqttClient.end.mockImplementation((force, opts, cb) => {
        cb();
      });

      // Act
      mqttClient.disconnect();

      // Assert
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        "rfxcom/bridge/status",
        "offline",
        expect.any(Object),
        expect.any(Function),
      );
      expect(mockMqttClient.end).toHaveBeenCalledWith(
        false,
        {},
        expect.any(Function),
      );
    });
  });
});
