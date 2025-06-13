import { jest } from "@jest/globals";
import BridgeDiscovery from "../../../adapters/discovery/BridgeDiscovery";
import { settingsService } from "../../../config/settings";
import { BridgeInfo } from "../../../core/models";
import { RfxcomInfo } from "../../../core/models/rfxcom";
import { loggerFactory, logger } from "../../../utils/logger";

// Mock dependencies
jest.mock("../../../config/settings", () => ({
  settingsService: {
    get: jest.fn().mockReturnValue({
      homeassistant: {
        discovery_topic: "homeassistant",
      },
    }),
    set: jest.fn(),
  },
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  loggerFactory: {
    setLevel: jest.fn(),
  },
}));

jest.mock("../../../utils/utils", () => ({
  getRfxcom2MQTTVersion: jest.fn().mockReturnValue("1.2.1"),
}));

describe("BridgeDiscovery", () => {
  let discovery: BridgeDiscovery;
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
        info: "bridge/info",
      },
    };

    // Create mock RFXCOM interface
    mockRfxtrx = {
      // Add any required methods for testing
    };

    // Create instance of BridgeDiscovery
    discovery = new BridgeDiscovery(mockMqtt, mockRfxtrx);

    // Spy on publishDiscovery method
    jest.spyOn(discovery, "publishDiscovery").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize correctly", () => {
      // Assert
      expect(discovery.getMqtt()).toBe(mockMqtt);
      expect(discovery.getRfxtrx()).toBe(mockRfxtrx);
    });
  });

  describe("start", () => {
    it("should call parent start method", async () => {
      // Arrange
      const superStartSpy = jest.spyOn(
        Object.getPrototypeOf(BridgeDiscovery.prototype),
        "start",
      );

      // Act
      await discovery.start();

      // Assert
      expect(superStartSpy).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should call parent stop method", async () => {
      // Arrange
      const superStopSpy = jest.spyOn(
        Object.getPrototypeOf(BridgeDiscovery.prototype),
        "stop",
      );

      // Act
      await discovery.stop();

      // Assert
      expect(superStopSpy).toHaveBeenCalled();
    });
  });

  describe("onMQTTMessage", () => {
    it("should handle log_level request", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/bridge/request/log_level",
        message: JSON.stringify({ log_level: "debug" }),
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(loggerFactory.setLevel).toHaveBeenCalledWith("debug");
      expect(logger.info).toHaveBeenCalledWith("update log level to : debug");
      expect(settingsService.set).toHaveBeenCalledWith(["loglevel"], "debug");
    });

    it("should not process other topics", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/other/topic",
        message: JSON.stringify({ some: "data" }),
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(loggerFactory.setLevel).not.toHaveBeenCalled();
      expect(settingsService.set).not.toHaveBeenCalled();
    });
  });

  describe("publishDiscoveryToMQTT", () => {
    it("should publish discovery information for the bridge", () => {
      // Arrange
      const bridgeInfo = new BridgeInfo();
      const coordinator = new RfxcomInfo();
      coordinator.hardwareVersion = "HW1.0";
      coordinator.firmwareVersion = 1.0;
      coordinator.receiverType = "Test Receiver";
      coordinator.receiverTypeCode = 123;
      coordinator.firmwareType = "Test Firmware";
      coordinator.enabledProtocols = ["protocol1", "protocol2"];
      bridgeInfo.coordinator = coordinator;
      bridgeInfo.version = "1.2.1";
      bridgeInfo.logLevel = "info";

      // Act
      discovery.publishDiscoveryToMQTT(bridgeInfo);

      // Assert
      // Should call publishDiscovery 4 times for different entities
      expect(discovery.publishDiscovery).toHaveBeenCalledTimes(4);

      // Check coordinator version sensor
      expect(discovery.publishDiscovery).toHaveBeenCalledWith(
        "sensor/bridge_rfxcom2mqtt_coordinator_version/version/config",
        expect.stringContaining('"name":"Coordinator Version"'),
      );

      // Check version sensor
      expect(discovery.publishDiscovery).toHaveBeenCalledWith(
        "sensor/bridge_rfxcom2mqtt_version/version/config",
        expect.stringContaining('"name":"Version"'),
      );

      // Check connection state binary sensor
      expect(discovery.publishDiscovery).toHaveBeenCalledWith(
        "binary_sensor/bridge_rfxcom2mqtt_version/connection_state/config",
        expect.stringContaining('"name":"Connection State"'),
      );

      // Check log level select
      expect(discovery.publishDiscovery).toHaveBeenCalledWith(
        "select/bridge_rfxcom2mqtt_log_level/log_level/config",
        expect.stringContaining('"name":"Log level"'),
      );
    });

    it("should include the correct topics in the published entities", () => {
      // Arrange
      const bridgeInfo = new BridgeInfo();
      const coordinator = new RfxcomInfo();
      coordinator.hardwareVersion = "HW1.0";
      coordinator.firmwareVersion = 1.0;
      coordinator.receiverType = "Test Receiver";
      coordinator.receiverTypeCode = 123;
      coordinator.firmwareType = "Test Firmware";
      coordinator.enabledProtocols = ["protocol1", "protocol2"];
      bridgeInfo.coordinator = coordinator;

      // Act
      discovery.publishDiscoveryToMQTT(bridgeInfo);

      // Assert
      // Check that the state_topic for the coordinator version sensor is correct
      expect(discovery.publishDiscovery).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          `"state_topic":"${mockMqtt.topics.base}/${mockMqtt.topics.info}"`,
        ),
      );

      // Check that the command_topic for the log level select is correct
      expect(discovery.publishDiscovery).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          `"command_topic":"${mockMqtt.topics.base}/bridge/request/log_level"`,
        ),
      );
    });
  });
});
