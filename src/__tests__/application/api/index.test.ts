import { Router, Request, Response, NextFunction } from "express";
import Discovery from "../../../adapters/discovery";
import Api from "../../../application/api";
import BridgeApi from "../../../application/api/BridgeApi";
import DeviceApi from "../../../application/api/DeviceApi";
import SettingApi from "../../../application/api/SettingApi";
import { BridgeInfo } from "../../../core/models";
import { DeviceStore } from "../../../core/store/state";
import StateStore from "../../../core/store/state";

// Mock the dependencies
jest.mock("express", () => ({
  Router: jest.fn(() => ({
    use: jest.fn(),
  })),
}));

jest.mock("../../../application/api/DeviceApi", () => {
  return jest.fn().mockImplementation(() => ({
    router: "deviceApiRouter",
  }));
});

jest.mock("../../../application/api/BridgeApi", () => {
  return jest.fn().mockImplementation(() => ({
    router: "bridgeApiRouter",
  }));
});

jest.mock("../../../application/api/SettingApi", () => {
  return jest.fn().mockImplementation(() => ({
    router: "settingApiRouter",
  }));
});

jest.mock("../../../utils/logger", () => ({
  loggerFactory: {
    getLogger: jest.fn(() => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    })),
  },
}));

describe("API Index", () => {
  let api: Api;
  let mockDevices: DeviceStore;
  let mockState: StateStore;
  let mockDiscovery: Discovery;
  let mockBridgeInfo: BridgeInfo;
  let mockActionCallback: jest.Mock;
  let mockRouter: any;
  let mockUseCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDevices = {} as DeviceStore;
    mockState = {} as StateStore;
    mockDiscovery = {} as Discovery;
    mockBridgeInfo = {} as BridgeInfo;
    mockActionCallback = jest.fn();
    mockUseCallback = jest.fn();
    mockRouter = {
      use: mockUseCallback,
    };

    (Router as jest.Mock).mockReturnValue(mockRouter);

    api = new Api(
      mockDevices,
      mockState,
      mockDiscovery,
      mockBridgeInfo,
      mockActionCallback,
    );
  });

  it("should create router and set up middleware", () => {
    // Assert
    expect(Router).toHaveBeenCalledTimes(1);
    expect(mockRouter.use).toHaveBeenCalledWith("*", expect.any(Function));
  });

  it("should initialize SettingApi and set up routes", () => {
    // Assert
    expect(SettingApi).toHaveBeenCalledTimes(1);
    expect(mockRouter.use).toHaveBeenCalledWith(
      "/settings",
      "settingApiRouter",
    );
  });

  it("should initialize DeviceApi and set up routes", () => {
    // Assert
    expect(DeviceApi).toHaveBeenCalledTimes(1);
    expect(DeviceApi).toHaveBeenCalledWith(
      mockDevices,
      mockState,
      mockDiscovery,
      mockActionCallback,
    );
    expect(mockRouter.use).toHaveBeenCalledWith("/devices", "deviceApiRouter");
  });

  it("should initialize BridgeApi and set up routes", () => {
    // Assert
    expect(BridgeApi).toHaveBeenCalledTimes(1);
    expect(BridgeApi).toHaveBeenCalledWith(mockBridgeInfo, mockActionCallback);
    expect(mockRouter.use).toHaveBeenCalledWith("/bridge", "bridgeApiRouter");
  });

  it("should log API requests in onApiRequest middleware", () => {
    // Arrange
    const mockReq = {
      method: "get",
      originalUrl: "/api/test",
      body: { test: "data" },
    } as unknown as Request;
    const mockRes = {} as Response;
    const mockNext = jest.fn() as NextFunction;

    // Find the middleware callback
    const middlewareCallback = mockUseCallback.mock.calls.find(
      (call) => call[0] === "*",
    )[1];

    // Act
    middlewareCallback(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
