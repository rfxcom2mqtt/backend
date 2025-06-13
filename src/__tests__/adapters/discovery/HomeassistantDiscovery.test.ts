import { jest } from "@jest/globals";
import HomeassistantDiscovery from "../../../adapters/discovery/HomeassistantDiscovery";
import { settingsService } from "../../../config/settings";
import { DeviceState, DeviceStateStore, DeviceSwitch, DeviceBinarySensor } from "../../../core/models";
import { logger } from "../../../utils/logger";

// Mock dependencies
jest.mock("../../../config/settings", () => ({
  settingsService: {
    get: jest.fn().mockReturnValue({
      homeassistant: {
        discovery_topic: "homeassistant",
        discovery_device: "rfxcom2mqtt",
      },
      devices: [],
    }),
  },
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../utils/utils", () => ({
  getRfxcom2MQTTVersion: jest.fn().mockReturnValue("1.2.1"),
}));

// Mock the lookup import
jest.mock("../../../adapters/discovery/Homeassistant", () => ({
  lookup: {
    temperature: { device_class: "temperature", unit_of_measurement: "°C" },
    humidity: { device_class: "humidity", unit_of_measurement: "%" },
    battery: { device_class: "battery", unit_of_measurement: "%" },
    linkquality: {
      device_class: "signal_strength",
      unit_of_measurement: "dBm",
    },
  },
}));

describe("HomeassistantDiscovery", () => {
  let discovery: HomeassistantDiscovery;
  let mockMqtt: any;
  let mockRfxtrx: any;
  let mockState: any;
  let mockDeviceStore: any;

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
      sendCommand: jest.fn(),
    };

    // Create mock state store
    mockState = {
      start: jest.fn(),
      stop: jest.fn(),
      set: jest.fn(),
      getByDeviceIdAndUnitCode: jest.fn().mockReturnValue({
        entityId: "device1_1",
        type: "lighting2",
        command: "off",
      }),
    };

    // Create mock device store
    mockDeviceStore = {
      exists: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      set: jest.fn(),
    };

    // Create instance of HomeassistantDiscovery
    discovery = new HomeassistantDiscovery(
      mockMqtt,
      mockRfxtrx,
      mockState,
      mockDeviceStore,
    );

    // Spy on publishDiscovery method
    jest.spyOn(discovery, "publishDiscovery").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with the correct properties", () => {
      // Assert
      expect(discovery.getMqtt()).toBe(mockMqtt);
      expect(discovery.getRfxtrx()).toBe(mockRfxtrx);
    });
  });

  describe("start", () => {
    it("should call parent start method and start state", async () => {
      // Arrange
      const superStartSpy = jest.spyOn(
        Object.getPrototypeOf(HomeassistantDiscovery.prototype),
        "start",
      );

      // Act
      await discovery.start();

      // Assert
      expect(superStartSpy).toHaveBeenCalled();
      expect(mockState.start).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should call parent stop method and stop state", async () => {
      // Arrange
      const superStopSpy = jest.spyOn(
        Object.getPrototypeOf(HomeassistantDiscovery.prototype),
        "stop",
      );

      // Act
      await discovery.stop();

      // Assert
      expect(superStopSpy).toHaveBeenCalled();
      expect(mockState.stop).toHaveBeenCalled();
    });
  });

  describe("onMQTTMessage", () => {
    it("should process lighting2 command messages", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/cmd/lighting2/0x123456/1",
        message: "on",
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Mqtt cmd from discovery"),
      );
      expect(mockState.getByDeviceIdAndUnitCode).toHaveBeenCalledWith(
        "0x123456",
        1,
      );
      expect(mockRfxtrx.sendCommand).toHaveBeenCalledWith(
        "lighting2",
        "0x123456",
        "switchOn",
        "0x123456/1",
      );
      expect(mockMqtt.publish).toHaveBeenCalled();
      expect(mockState.set).toHaveBeenCalled();
    });

    it("should process lighting2 off command messages", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/cmd/lighting2/0x123456/1",
        message: "off",
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(mockRfxtrx.sendCommand).toHaveBeenCalledWith(
        "lighting2",
        "0x123456",
        "switchOff",
        "0x123456/1",
      );
    });

    it("should process lighting2 group command messages", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/cmd/lighting2/0x123456/1",
        message: "group on",
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(mockRfxtrx.sendCommand).toHaveBeenCalledWith(
        "lighting2",
        "0x123456",
        "switchOn",
        "0x123456/1",
      );
    });

    it("should process lighting2 level command messages", () => {
      // Arrange
      const data = {
        topic: "rfxcom2mqtt/cmd/lighting2/0x123456/1",
        message: "level 5",
      };

      // Act
      discovery.onMQTTMessage(data);

      // Assert
      expect(mockRfxtrx.sendCommand).toHaveBeenCalledWith(
        "lighting2",
        "0x123456",
        "setLevel",
        "0x123456/1",
      );
    });
  });

  describe("updateEntityStateFromValue", () => {
    it("should update lighting2 entity state for on command", () => {
      // Arrange
      const entityState: any = {
        type: "lighting2",
        command: "off",
      };

      // Act
      discovery.updateEntityStateFromValue(entityState, "on");

      // Assert
      expect(entityState.command).toBe("on");
      expect(entityState.commandNumber).toBe(1);
      expect(entityState.rfxFunction).toBe("switchOn");
    });

    it("should update lighting2 entity state for off command", () => {
      // Arrange
      const entityState: any = {
        type: "lighting2",
        command: "on",
      };

      // Act
      discovery.updateEntityStateFromValue(entityState, "off");

      // Assert
      expect(entityState.command).toBe("off");
      expect(entityState.commandNumber).toBe(0);
      expect(entityState.rfxFunction).toBe("switchOff");
    });

    it("should update lighting2 entity state for group on command", () => {
      // Arrange
      const entityState: any = {
        type: "lighting2",
        command: "off",
      };

      // Act
      discovery.updateEntityStateFromValue(entityState, "group on");

      // Assert
      expect(entityState.command).toBe("group on");
      expect(entityState.commandNumber).toBe(4);
      expect(entityState.rfxFunction).toBe("switchOn");
    });

    it("should update lighting2 entity state for level command", () => {
      // Arrange
      const entityState: any = {
        type: "lighting2",
        command: "off",
      };

      // Act
      discovery.updateEntityStateFromValue(entityState, "level 5");

      // Assert
      expect(entityState.command).toBe("level 5");
      expect(entityState.rfxFunction).toBe("setLevel");
      expect(entityState.rfxOpt).toBe("5");
    });

    it("should update lighting4 entity state", () => {
      // Arrange
      const entityState: any = {
        type: "lighting4",
        command: "",
      };

      // Act
      discovery.updateEntityStateFromValue(entityState, "data");

      // Assert
      expect(entityState.command).toBe("data");
      expect(entityState.rfxFunction).toBe("sendData");
    });

    it("should update chime1 entity state", () => {
      // Arrange
      const entityState: any = {
        type: "chime1",
        command: "",
      };

      // Act
      discovery.updateEntityStateFromValue(entityState, "chime");

      // Assert
      expect(entityState.command).toBe("chime");
      expect(entityState.rfxFunction).toBe("chime");
    });
  });

  describe("publishDiscoveryToMQTT", () => {
    it("should create and publish a new device when it does not exist", () => {
      // Arrange
      const payload = {
        id: "0x123456",
        type: "lighting2",
        subtype: "1",
        subTypeValue: "AC",
        rssi: -70,
        batteryLevel: 90,
        temperature: 21.5,
        humidity: 45,
      };

      // Act
      discovery.publishDiscoveryToMQTT(payload);

      // Assert
      expect(mockDeviceStore.exists).toHaveBeenCalledWith("0x123456");
      expect(mockDeviceStore.set).toHaveBeenCalled();
      expect(mockState.set).toHaveBeenCalled();
    });

    it("should update an existing device when it exists", () => {
      // Arrange
      mockDeviceStore.exists.mockReturnValueOnce(true);
      mockDeviceStore.get.mockReturnValueOnce({
        id: "0x123456",
        name: "Existing Device",
      });

      const payload = {
        id: "0x123456",
        type: "lighting2",
        subtype: "1",
        subTypeValue: "AC",
      };

      // Act
      discovery.publishDiscoveryToMQTT(payload);

      // Assert
      expect(mockDeviceStore.get).toHaveBeenCalledWith("0x123456");
      expect(mockDeviceStore.set).toHaveBeenCalled();
    });
  });

  describe("loadDiscoverySensorInfo", () => {
    it("should add sensors based on payload properties", () => {
      // Arrange
      const deviceState = new DeviceState("0x123456", "Test Device");
      const deviceJson = new DeviceStateStore(deviceState);
      const payload = {
        rssi: -70,
        batteryLevel: 90,
        temperature: 21.5,
        humidity: 45,
        batteryVoltage: 3.2,
        co2: 800,
        power: 100,
        energy: 1000,
        barometer: 1013,
        count: 5,
        weight: 75,
        uv: 3,
      };

      // Act
      discovery.loadDiscoverySensorInfo(payload, deviceJson);

      // Assert
      expect(Object.keys(deviceJson.getSensors()).length).toBeGreaterThan(0);
    });
  });

  describe("publishDiscoveryDeviceToMqtt", () => {
    it("should publish discovery information for all entity types", () => {
      // Arrange
      const deviceState = new DeviceState("0x123456", "Test Device");
      const deviceJson = new DeviceStateStore(deviceState);

      // Add a switch
      const switchObj = new DeviceSwitch(
        "0x123456_switch",
        "Switch",
        "Original Switch",
        1,
        "On",
        "Off"
      );
      deviceJson.addSwitch(switchObj);

      // Add a binary sensor with boolean values
      const binarySensor = new DeviceBinarySensor(
        "0x123456_motion",
        "Motion",
        "Motion sensor",
        "motion",
        "motion"
      );
      deviceJson.addBinarySensor(binarySensor);

      const bridgeName = "rfxcom2mqtt";

      // Act
      discovery.publishDiscoveryDeviceToMqtt(deviceJson, bridgeName);

      // Assert
      // Should publish discovery for each entity type
      expect(discovery.publishDiscovery).toHaveBeenCalled();
    });
  });
});
