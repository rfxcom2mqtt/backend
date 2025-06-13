import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import BridgeApi from "../../../application/api/BridgeApi";
import { BridgeInfo, Action } from "../../../core/models";

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

describe("BridgeApi", () => {
  let bridgeApi: BridgeApi;
  let mockBridgeInfo: BridgeInfo;
  let mockActionCallback: jest.Mock;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockBridgeInfo = {
      version: "1.2.1",
      coordinator: {
        receiverType: "Test",
        firmwareVersion: 123,
      },
      logLevel: "info",
    } as BridgeInfo;

    mockActionCallback = jest.fn();

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Create BridgeApi instance
    bridgeApi = new BridgeApi(mockBridgeInfo, mockActionCallback);

    // Get the mock router
    mockRouter = require("express").Router();
  });

  describe("constructor", () => {
    it("should initialize with the provided bridge info and set up routes", () => {
      // Assert
      expect(require("express").Router).toHaveBeenCalled();
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/info",
        expect.any(Function),
      );
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/action",
        expect.any(Function),
      );
    });
  });

  describe("GET /info", () => {
    it("should return bridge info", () => {
      // Arrange
      const infoHandler = mockRouter.get.mock.calls[0][1];

      // Act
      infoHandler(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockBridgeInfo);
    });
  });

  describe("POST /action", () => {
    it("should call action callback with bridge action", () => {
      // Arrange
      const actionHandler = mockRouter.post.mock.calls[0][1];
      mockRequest.body = { action: "restart" };

      // Act
      actionHandler(mockRequest, mockResponse);

      // Assert
      expect(mockActionCallback).toHaveBeenCalledWith(
        new Action("bridge", "restart"),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({});
    });

    it("should handle missing action in request body", () => {
      // Arrange
      const actionHandler = mockRouter.post.mock.calls[0][1];
      mockRequest.body = {};

      // Act
      actionHandler(mockRequest, mockResponse);

      // Assert
      expect(mockActionCallback).toHaveBeenCalledWith(
        new Action("bridge", undefined),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({});
    });
  });
});
