import { jest } from "@jest/globals";
import Controller from "../../core/Controller";
import { getMqttInstance } from "../../adapters/mqtt";
import { getRfxcomInstance } from "../../adapters/rfxcom";
import { settingsService } from "../../config/settings";
import { RfxcomEvent, Lighting2Event } from "../../core/models/rfxcom";
import { MockMqtt } from "../../adapters/mqtt/MockMqtt";
import MockRfxcom from "../../adapters/rfxcom/Mock";

// Mock the adapter modules
jest.mock("../../adapters/mqtt", () => ({
  getMqttInstance: jest.fn()
}));

jest.mock("../../adapters/rfxcom", () => ({
  getRfxcomInstance: jest.fn()
}));

// Mock the settings service
jest.mock("../../config/settings", () => ({
  settingsService: {
    read: jest.fn(),
    get: jest.fn()
  }
}));

// We're not mocking the logger to use the real implementation in e2e tests

// Mock utils module
jest.mock("../../utils/utils", () => ({
  getRfxcom2MQTTVersion: jest.fn().mockReturnValue("1.2.1")
}));

// Only mock the external dependencies that we can't control in tests
jest.mock("node-cron");
jest.mock("../../application");

describe("RFXCOM to MQTT End-to-End Flow", () => {
  let controller: Controller;
  let exitCallback: jest.Mock;
  let mqttClient: MockMqtt;
  let rfxcomInstance: MockRfxcom;
  let statusHandler: any;
  let protocolEventHandler: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup test settings
    const testSettings = {
      frontend: { enabled: true },
      mqtt: { 
        base_topic: "rfxcom2mqtt",
        server: "mock", // Use mock server to trigger MockMqtt
        port: 1883,
        retain: true,
        qos: 0
      },
      rfxcom: { 
        usbport: "mock", // Use mock port to trigger MockRfxcom
        debug: true,
        receive: ["lighting2", "tempHumBaro1"]
      },
      homeassistant: { discovery: true, discovery_topic: "homeassistant", discovery_device: "rfxcom2mqtt" },
      healthcheck: { enabled: false, cron: "* * * * *" },
      cacheState: { enable: false, saveInterval: 1 },
      loglevel: "info",
      devices: []
    };
    
    // Configure the settings service mock
    (settingsService.read as jest.Mock).mockReturnValue(testSettings);
    (settingsService.get as jest.Mock).mockReturnValue(testSettings);
    
    // Create real instances of MockMqtt and MockRfxcom
    mqttClient = new MockMqtt();
    rfxcomInstance = new MockRfxcom();
    
    // Spy on the methods we need to track
    jest.spyOn(mqttClient, 'connect').mockImplementation(() => Promise.resolve());
    jest.spyOn(mqttClient, 'disconnect');
    jest.spyOn(mqttClient, 'addListener');
    jest.spyOn(mqttClient, 'publish').mockImplementation((topic, payload, callback) => callback());
    jest.spyOn(mqttClient, 'publishState');
    jest.spyOn(mqttClient, 'isConnected').mockReturnValue(true);
    
    jest.spyOn(rfxcomInstance, 'initialise').mockImplementation(() => Promise.resolve());
    jest.spyOn(rfxcomInstance, 'stop');
    jest.spyOn(rfxcomInstance, 'getStatus').mockImplementation((callback) => callback("online"));
    jest.spyOn(rfxcomInstance, 'onStatus').mockImplementation((callback) => {
      statusHandler = callback;
    });
    jest.spyOn(rfxcomInstance, 'onDisconnect');
    jest.spyOn(rfxcomInstance, 'subscribeProtocolsEvent').mockImplementation((callback) => {
      protocolEventHandler = callback;
    });
    jest.spyOn(rfxcomInstance, 'onCommand');
    
    // Override the factory functions to return our instances
    (getMqttInstance as jest.Mock).mockReturnValue(mqttClient);
    (getRfxcomInstance as jest.Mock).mockReturnValue(rfxcomInstance);
    
    
    exitCallback = jest.fn();
    controller = new Controller(exitCallback);
  });

  describe("End-to-End Flow Tests", () => {
    it("should start all components and establish connections", async () => {
      // Act
      await controller.start();

      // Assert
      expect(rfxcomInstance.initialise).toHaveBeenCalled();
      expect(mqttClient.connect).toHaveBeenCalled();
      expect(rfxcomInstance.subscribeProtocolsEvent).toHaveBeenCalled();
      expect(rfxcomInstance.onStatus).toHaveBeenCalled();
      expect(rfxcomInstance.onDisconnect).toHaveBeenCalled();
    });

    it("should process RFXCOM events and publish them to MQTT", async () => {
      // Arrange
      await controller.start();
      
      // Verify handlers were registered
      expect(statusHandler).toBeDefined();
      expect(protocolEventHandler).toBeDefined();
      
      // Create a mock RFXCOM event
      const mockEvent: Lighting2Event = {
        id: "0x123ABC",
        seqnbr: 1,
        subtype: 0,
        unitCode: "1",
        commandNumber: 0,
        command: "On",
        level: 15,
        rssi: 8,
        type: "lighting2",
        deviceName: "AC",
        group: false,
        subTypeValue: "AC"
      };
      
      // Act - Simulate receiving an event from RFXCOM
      protocolEventHandler("lighting2", mockEvent);
      
      // Assert - Check if the event was published to MQTT
      // Find the call that contains the device ID and unit code
      const devicePublishCall = (mqttClient.publish as jest.Mock).mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes("devices") && call[0].includes("0x123ABC/1")
      );
      expect(devicePublishCall).toBeDefined();
      
      // Verify the payload contains the correct data
      if (devicePublishCall) {
        const payload = JSON.parse(devicePublishCall[1] as string);
        
        expect(payload).toMatchObject({
          id: "0x123ABC",
          type: "lighting2",
          command: "On",
          level: 15,
          unitCode: "1"
        });
      }
      
    });

    it("should process MQTT commands and send them to RFXCOM", async () => {
      // Arrange
      await controller.start();
      
      // Get the MQTT listeners that were registered
      // First listener is Discovery, second is Controller
      expect(mqttClient.addListener).toHaveBeenCalled();
      
      // Create a mock MQTT message
      const mqttMessage = {
        topic: "rfxcom2mqtt/command/lighting2/0x123ABC/1",
        message: JSON.stringify({
          subtype: "AC",
          deviceFunction: "switchOn"
        })
      };
      
      // Act - Simulate receiving a command from MQTT
      controller.onMQTTMessage(mqttMessage);
      
      // Assert - Check if the command was sent to RFXCOM
      expect(rfxcomInstance.onCommand).toHaveBeenCalledWith(
        "lighting2",
        "0x123ABC/1",
        expect.any(String),
        undefined
      );
    });

    it("should handle bridge status updates", async () => {
      // Arrange
      await controller.start();
      
      expect(statusHandler).toBeDefined();
      
      // Create a mock status update
      const mockStatus = {
        receiverTypeCode: 83,
        receiverType: "RFXtrx433",
        hardwareVersion: "1.0",
        firmwareVersion: 242,
        firmwareType: "Ext",
        enabledProtocols: ["LIGHTING2", "OREGON"]
      };
      
      // Act - Simulate receiving a status update from RFXCOM
      statusHandler(mockStatus);
      
      // Assert - Check if the status was published to MQTT
      // Find the call that contains bridge/info
      const bridgeInfoCall = (mqttClient.publish as jest.Mock).mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes("bridge/info")
      );
      expect(bridgeInfoCall).toBeDefined();
      
      // Verify the payload contains the correct data
      if (bridgeInfoCall) {
        const payload = JSON.parse(bridgeInfoCall[1] as string);
        
        expect(payload).toMatchObject({
          coordinator: mockStatus,
          version: "1.2.1"
        });
      }
    });

    it("should gracefully stop all components", async () => {
      // Arrange
      await controller.start();
      
      // Act
      await controller.stop();
      
      // Assert
      expect(mqttClient.disconnect).toHaveBeenCalled();
      expect(rfxcomInstance.stop).toHaveBeenCalled();
      expect(exitCallback).toHaveBeenCalledWith(0, false);
    });
  });
});
