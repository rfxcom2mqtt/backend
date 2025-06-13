import { jest } from "@jest/globals";
import Discovery from "../../../adapters/discovery";
import BridgeDiscovery from "../../../adapters/discovery/BridgeDiscovery";
import HomeassistantDiscovery from "../../../adapters/discovery/HomeassistantDiscovery";
import { DeviceState, DeviceStateStore } from "../../../core/models";

// @ts-nocheck

// Mock dependencies
jest.mock("../../../adapters/discovery/HomeassistantDiscovery", () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    onMQTTMessage: jest.fn(),
    publishDiscoveryToMQTT: jest.fn(),
    publishDiscoveryDeviceToMqtt: jest.fn(),
  }));
});

jest.mock("../../../adapters/discovery/BridgeDiscovery", () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    onMQTTMessage: jest.fn(),
    publishDiscoveryToMQTT: jest.fn(),
  }));
});

describe("Discovery", () => {
  let discovery: Discovery;
  let mockMqtt: any;
  let mockRfxtrx: any;
  let mockState: any;
  let mockDevice: any;

  beforeEach(() => {
    // Create mock dependencies
    mockMqtt = {
      topics: {
        base: "rfxcom2mqtt",
        will: "bridge/status",
        devices: "devices",
      },
    };

    mockRfxtrx = {};
    mockState = {};
    mockDevice = {};

    // Create instance of Discovery
    discovery = new Discovery(mockMqtt, mockRfxtrx, mockState, mockDevice);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with the correct properties", () => {
      // Assert
      expect(discovery.getBaseTopic()).toBe("rfxcom2mqtt");
      expect(discovery.homeassistant).toBeDefined();
      expect(discovery.bridge).toBeDefined();
      expect(HomeassistantDiscovery).toHaveBeenCalledWith(
        mockMqtt,
        mockRfxtrx,
        mockState,
        mockDevice,
      );
      expect(BridgeDiscovery).toHaveBeenCalledWith(mockMqtt, mockRfxtrx);
    });
  });

  describe("start", () => {
    it("should start both homeassistant and bridge discovery", async () => {
      // Act
      await discovery.start();

      // Assert
      expect(discovery.homeassistant.start).toHaveBeenCalled();
      expect(discovery.bridge.start).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should stop both homeassistant and bridge discovery", async () => {
      // Act
      await discovery.stop();

      // Assert
      expect(discovery.homeassistant.stop).toHaveBeenCalled();
      expect(discovery.bridge.stop).toHaveBeenCalled();
    });
  });

  describe("subscribeTopic", () => {
    it("should return the correct topics to subscribe to", () => {
      // Act
      const topics = discovery.subscribeTopic();

      // Assert
      expect(topics).toEqual([
        "rfxcom2mqtt/cmd/#",
        "rfxcom2mqtt/bridge/request/#",
      ]);
    });
  });

  describe("onMQTTMessage", () => {
    it("should route cmd topics to homeassistant discovery", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/cmd/lighting2/0x123456/1",
        message: "on",
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(discovery.homeassistant.onMQTTMessage).toHaveBeenCalledWith(data);
      expect(discovery.bridge.onMQTTMessage).not.toHaveBeenCalled();
    });

    it("should route bridge request topics to bridge discovery", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/bridge/request/log_level",
        message: JSON.stringify({ log_level: "debug" }),
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(discovery.bridge.onMQTTMessage).toHaveBeenCalledWith(data);
      expect(discovery.homeassistant.onMQTTMessage).not.toHaveBeenCalled();
    });

    it("should not route other topics", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/other/topic",
        message: "test",
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(discovery.homeassistant.onMQTTMessage).not.toHaveBeenCalled();
      expect(discovery.bridge.onMQTTMessage).toHaveBeenCalled(); // Default case routes to bridge
    });
  });

  describe("publishDiscoveryToMQTT", () => {
    it("should route device payloads to homeassistant discovery", () => {
      // Arrange
      const message = {
        device: true,
        payload: { id: "device1" },
      };

      // Act
      discovery.publishDiscoveryToMQTT(message);

      // Assert
      expect(
        discovery.homeassistant.publishDiscoveryToMQTT,
      ).toHaveBeenCalledWith(message.payload);
      expect(discovery.bridge.publishDiscoveryToMQTT).not.toHaveBeenCalled();
    });

    it("should route bridge payloads to bridge discovery", () => {
      // Arrange
      const message = {
        device: false,
        payload: { version: "1.2.1" },
      };

      // Act
      discovery.publishDiscoveryToMQTT(message);

      // Assert
      expect(discovery.bridge.publishDiscoveryToMQTT).toHaveBeenCalledWith(
        message.payload,
      );
      expect(
        discovery.homeassistant.publishDiscoveryToMQTT,
      ).not.toHaveBeenCalled();
    });
  });

  describe("publishDiscoveryDeviceToMqtt", () => {
    it("should delegate to homeassistant discovery", () => {
      // Arrange
      const deviceState = new DeviceState("device1", "Test Device");
      const deviceJson = new DeviceStateStore(deviceState);
      const bridgeName = "rfxcom2mqtt";

      // Act
      discovery.publishDiscoveryDeviceToMqtt(deviceJson, bridgeName);

      // Assert
      expect(
        discovery.homeassistant.publishDiscoveryDeviceToMqtt,
      ).toHaveBeenCalledWith(deviceJson, bridgeName);
    });
  });
});
