import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import SettingApi from "../../../application/api/SettingApi";
import { settingsService } from "../../../config/settings";

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

// Mock settings service
jest.mock("../../../config/settings", () => ({
  settingsService: {
    get: jest.fn().mockReturnValue({
      frontend: { enabled: true },
      mqtt: { base_topic: "rfxcom2mqtt" },
      rfxcom: { usbport: "/dev/ttyUSB0" },
      homeassistant: { discovery: true },
      healthcheck: { enabled: false },
    }),
    apply: jest.fn(),
  },
}));

describe("SettingApi", () => {
  let settingApi: SettingApi;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Create SettingApi instance
    settingApi = new SettingApi();

    // Get the mock router
    mockRouter = require("express").Router();
  });

  describe("constructor", () => {
    it("should initialize and set up routes", () => {
      // Assert
      expect(require("express").Router).toHaveBeenCalled();
      expect(mockRouter.get).toHaveBeenCalledWith("/", expect.any(Function));
      expect(mockRouter.post).toHaveBeenCalledWith("/", expect.any(Function));
    });
  });

  describe("GET /", () => {
    it("should return settings", () => {
      // Arrange
      const getHandler = mockRouter.get.mock.calls[0][1];
      const mockSettings = {
        frontend: { enabled: true },
        mqtt: { base_topic: "rfxcom2mqtt" },
        rfxcom: { usbport: "/dev/ttyUSB0" },
        homeassistant: { discovery: true },
        healthcheck: { enabled: false },
      };
      (settingsService.get as jest.Mock).mockReturnValue(mockSettings);

      // Act
      getHandler(mockRequest, mockResponse);

      // Assert
      expect(settingsService.get).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockSettings);
    });
  });

  describe("POST /", () => {
    it("should apply settings and return updated settings", () => {
      // Arrange
      const postHandler = mockRouter.post.mock.calls[0][1];
      const newSettings = {
        frontend: { enabled: false },
        mqtt: { base_topic: "custom/topic" },
      };
      mockRequest.body = newSettings;

      const updatedSettings = {
        frontend: { enabled: false },
        mqtt: { base_topic: "custom/topic" },
        rfxcom: { usbport: "/dev/ttyUSB0" },
        homeassistant: { discovery: true },
        healthcheck: { enabled: false },
      };
      (settingsService.get as jest.Mock).mockReturnValue(updatedSettings);

      // Act
      postHandler(mockRequest, mockResponse);

      // Assert
      expect(settingsService.apply).toHaveBeenCalledWith(newSettings);
      expect(settingsService.get).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(updatedSettings);
    });

    it("should handle empty request body", () => {
      // Arrange
      const postHandler = mockRouter.post.mock.calls[0][1];
      mockRequest.body = {};

      const settings = {
        frontend: { enabled: true },
        mqtt: { base_topic: "rfxcom2mqtt" },
        rfxcom: { usbport: "/dev/ttyUSB0" },
        homeassistant: { discovery: true },
        healthcheck: { enabled: false },
      };
      (settingsService.get as jest.Mock).mockReturnValue(settings);

      // Act
      postHandler(mockRequest, mockResponse);

      // Assert
      expect(settingsService.apply).toHaveBeenCalledWith({});
      expect(settingsService.get).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(settings);
    });
  });
});
