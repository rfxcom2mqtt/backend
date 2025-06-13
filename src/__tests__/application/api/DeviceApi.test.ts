import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Discovery from "../../../adapters/discovery";
import DeviceApi from "../../../application/api/DeviceApi";
import { settingsService } from "../../../config/settings";
import { Action, DeviceStateStore } from "../../../core/models";
import StateStore, { DeviceStore } from "../../../core/store/state";
import { loggerFactory } from "../../../utils/logger";

// Mock Express Router
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
  };

  return {
    Router: jest.fn().mockReturnValue(mockRouter),
  };
});

// Mock Discovery
jest.mock("../../../adapters/discovery", () => {
  return jest.fn().mockImplementation(() => ({
    publishDiscoveryDeviceToMqtt: jest.fn(),
  }));
});

// Mock settings service
jest.mock("../../../config/settings", () => ({
  settingsService: {
    get: jest.fn().mockReturnValue({
      homeassistant: {
        discovery_device: "rfxcom2mqtt",
      },
    }),
    applyDeviceOverride: jest.fn(),
  },
}));

// Mock DeviceStateStore
jest.mock("../../../core/models", () => {
  const originalModule = jest.requireActual("../../../core/models");

  return {
    ...originalModule,
    DeviceStateStore: jest.fn().mockImplementation((state) => ({
      state,
      overrideDeviceInfo: jest.fn(),
      getSensors: jest.fn().mockReturnValue([
        { id: "sensor1", type: "temperature" },
        { id: "sensor2", type: "humidity" },
      ]),
    })),
  };
});

// Mock lookup
jest.mock("../../../adapters/discovery/Homeassistant", () => ({
  lookup: {
    temperature: { name: "Temperature", icon: "thermometer" },
    humidity: { name: "Humidity", icon: "water-percent" },
  },
}));

// Mock logger
jest.mock("../../../utils/logger", () => ({
  loggerFactory: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe("DeviceApi", () => {
  let deviceApi: DeviceApi;
  let mockDevicesStore: DeviceStore;
  let mockState: StateStore;
  let mockDiscovery: Discovery;
  let mockActionCallback: jest.Mock;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockDevicesStore = {
      getAll: jest.fn().mockReturnValue([
        { id: "device1", name: "Device 1" },
        { id: "device2", name: "Device 2" },
      ]),
      get: jest.fn().mockReturnValue({ id: "device1", name: "Device 1" }),
      set: jest.fn(),
    } as unknown as DeviceStore;

    mockState = {
      getByDeviceId: jest.fn().mockReturnValue([
        { id: "state1", value: "on" },
        { id: "state2", value: "off" },
      ]),
    } as unknown as StateStore;

    // Create mock objects for Discovery constructor
    const mockMqtt = {
      topics: { base: "rfxcom2mqtt" },
    } as any;

    const mockRfxcom = {} as any;

    mockDiscovery = new Discovery(
      mockMqtt,
      mockRfxcom,
      mockState,
      mockDevicesStore,
    );

    mockActionCallback = jest.fn();

    mockRequest = {
      params: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Create DeviceApi instance
    deviceApi = new DeviceApi(
      mockDevicesStore,
      mockState,
      mockDiscovery,
      mockActionCallback,
    );

    // Get the mock router
    mockRouter = require("express").Router();
  });

  describe("constructor", () => {
    it("should initialize and set up routes", () => {
      // Assert
      expect(require("express").Router).toHaveBeenCalled();
      expect(mockRouter.get).toHaveBeenCalledWith("/", expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith("/:id", expect.any(Function));
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/:id/rename",
        expect.any(Function),
      );
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/:id/state",
        expect.any(Function),
      );
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/:id/action",
        expect.any(Function),
      );
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/:id/switch/:itemId/rename",
        expect.any(Function),
      );
    });
  });

  describe("GET /", () => {
    it("should return all devices with overridden info", () => {
      // Arrange
      const getAllHandler = mockRouter.get.mock.calls.find(
        (call) => call[0] === "/",
      )[1];

      // Act
      getAllHandler(mockRequest, mockResponse);

      // Assert
      expect(mockDevicesStore.getAll).toHaveBeenCalled();
      expect(DeviceStateStore).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith([
        { id: "device1", name: "Device 1" },
        { id: "device2", name: "Device 2" },
      ]);
    });
  });

  describe("GET /:id", () => {
    it("should return device info with sensors", () => {
      // Arrange
      const getDeviceHandler = mockRouter.get.mock.calls.find(
        (call) => call[0] === "/:id",
      )[1];
      mockRequest.params = { id: "device1" };

      // Act
      getDeviceHandler(mockRequest, mockResponse);

      // Assert
      expect(mockDevicesStore.get).toHaveBeenCalledWith("device1");
      expect(DeviceStateStore).toHaveBeenCalledWith({
        id: "device1",
        name: "Device 1",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: "device1",
        name: "Device 1",
      });
    });
  });

  describe("POST /:id/rename", () => {
    it("should rename device and update discovery", () => {
      // Arrange
      const renameHandler = mockRouter.post.mock.calls.find(
        (call) => call[0] === "/:id/rename",
      )[1];
      mockRequest.params = { id: "device1" };
      mockRequest.body = { name: "New Device Name" };

      // Act
      renameHandler(mockRequest, mockResponse);

      // Assert
      expect(settingsService.applyDeviceOverride).toHaveBeenCalledWith({
        id: "device1",
        name: "New Device Name",
      });
      expect(mockDevicesStore.get).toHaveBeenCalledWith("device1");
      expect(mockDevicesStore.set).toHaveBeenCalledWith("device1", {
        id: "device1",
        name: "Device 1",
      });
      expect(mockDiscovery.publishDiscoveryDeviceToMqtt).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({});
    });
  });

  describe("GET /:id/state", () => {
    it("should return device state", () => {
      // Arrange
      const getStateHandler = mockRouter.get.mock.calls.find(
        (call) => call[0] === "/:id/state",
      )[1];
      mockRequest.params = { id: "device1" };

      // Act
      getStateHandler(mockRequest, mockResponse);

      // Assert
      expect(mockState.getByDeviceId).toHaveBeenCalledWith("device1");
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith([
        { id: "state1", value: "on" },
        { id: "state2", value: "off" },
      ]);
    });
  });

  describe("POST /:id/action", () => {
    it("should execute device action", () => {
      // Arrange
      const actionHandler = mockRouter.post.mock.calls.find(
        (call) => call[0] === "/:id/action",
      )[1];
      mockRequest.params = { id: "device1" };
      mockRequest.body = { action: "toggle", entityId: "switch1" };

      // Act
      actionHandler(mockRequest, mockResponse);

      // Assert
      expect(mockActionCallback).toHaveBeenCalledWith(
        new Action("device", "toggle", "device1", "switch1"),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({});
    });
  });

  describe("POST /:id/switch/:itemId/rename", () => {
    it("should rename device sensor", () => {
      // Arrange
      const renameSensorHandler = mockRouter.post.mock.calls.find(
        (call) => call[0] === "/:id/switch/:itemId/rename",
      )[1];
      mockRequest.params = { id: "device1", itemId: "sensor1" };
      mockRequest.body = { name: "New Sensor Name", unitCode: "1" };

      // Act
      renameSensorHandler(mockRequest, mockResponse);

      // Assert
      expect(settingsService.applyDeviceOverride).toHaveBeenCalledWith({
        id: "device1",
        units: [{ unitCode: 1, name: "New Sensor Name" }],
      });
      expect(mockDevicesStore.get).toHaveBeenCalledWith("device1");
      expect(mockDevicesStore.set).toHaveBeenCalledWith("device1", {
        id: "device1",
        name: "Device 1",
      });
      expect(mockDiscovery.publishDiscoveryDeviceToMqtt).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({});
    });
  });
});
