import { jest } from "@jest/globals";
import AbstractDiscovery from "../../../adapters/discovery/AbstractDiscovery";
import { settingsService } from "../../../config/settings";
import utils from "../../../utils/utils";

// @ts-nocheck

// Mock dependencies
jest.mock("../../../config/settings", () => ({
  settingsService: {
    get: jest.fn().mockReturnValue({
      homeassistant: {
        discovery_topic: "homeassistant",
      },
    }),
  },
}));

jest.mock("../../../utils/utils", () => ({
  getRfxcom2MQTTVersion: jest.fn().mockReturnValue("1.2.1"),
}));

describe("AbstractDiscovery", () => {
  let discovery: AbstractDiscovery;
  let mockMqtt: any;
  let mockRfxtrx: any;

  beforeEach(() => {
    // Create mock MQTT client
    mockMqtt = {
      publish: jest.fn((topic, payload, callback, options, prefix) => {
        if (typeof callback === 'function') callback(null);
      }),
      topics: {
        base: "rfxcom2mqtt",
        will: "bridge/status",
        devices: "devices",
      },
    };

    // Create mock RFXCOM interface
    mockRfxtrx = {
      // Add any required methods for testing
    };

    // Create instance of AbstractDiscovery
    discovery = new AbstractDiscovery(mockMqtt, mockRfxtrx);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with the correct properties", () => {
      // Assert
      expect(discovery.getMqtt()).toBe(mockMqtt);
      expect(discovery.getRfxtrx()).toBe(mockRfxtrx);
      expect(discovery.getTopicWill()).toBe("rfxcom2mqtt/bridge/status");
      expect(discovery.getTopicDevice()).toBe("rfxcom2mqtt/devices");
      expect(discovery.getBaseTopic()).toBe("rfxcom2mqtt");
      expect(discovery.getDiscoveryOrigin()).toEqual({
        name: "Rfxcom2MQTT",
        sw: "",
        url: "https://rfxcom2mqtt.github.io/rfxcom2mqtt/",
      });
    });
  });

  describe("start", () => {
    it("should set the software version in discoveryOrigin", async () => {
      // Act
      await discovery.start();

      // Assert
      expect(utils.getRfxcom2MQTTVersion).toHaveBeenCalled();
      expect(discovery.getDiscoveryOrigin().sw).toBe("1.2.1");
    });
  });

  describe("stop", () => {
    it("should not throw an error", async () => {
      // Act & Assert
      await expect(discovery.stop()).resolves.not.toThrow();
    });
  });

  describe("publishDiscovery", () => {
    it("should publish to the correct topic with retain and qos options", () => {
      // Arrange
      const topic = "test/topic";
      const payload = { test: "value" };

      // Act
      discovery.publishDiscovery(topic, payload);

      // Assert
      expect(mockMqtt.publish).toHaveBeenCalledWith(
        topic,
        payload,
        expect.any(Function),
        { retain: true, qos: 1 },
        "homeassistant",
      );
    });

    it("should use the discovery topic from settings", () => {
      // Arrange
      const customDiscoveryTopic = "custom_discovery";
      (settingsService.get as jest.Mock).mockReturnValueOnce({
        homeassistant: {
          discovery_topic: customDiscoveryTopic,
        },
      });

      // Act
      discovery.publishDiscovery("test/topic", {});

      // Assert
      expect(mockMqtt.publish).toHaveBeenCalledWith(
        "test/topic",
        {},
        expect.any(Function),
        { retain: true, qos: 1 },
        customDiscoveryTopic,
      );
    });

    it("should handle errors in the callback", () => {
      // Arrange
      mockMqtt.publish = jest.fn((topic, payload, callback) => {
        if (typeof callback === 'function') callback(new Error("Test error"));
      });

      // Act & Assert - should not throw
      expect(() => {
        discovery.publishDiscovery("test/topic", {});
      }).not.toThrow();
    });
  });
});
