import WebSocketService from "../../server/WebSocketService";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { LogEventTransport, loggerFactory } from "../../utils/logger";
import { ProxyConfig } from "../../utils/utils";

jest.mock("socket.io");
jest.mock("uuid", () => ({
  v4: jest.fn(() => "uuid-v4"),
}));

describe("WebSocketService", () => {
  let webSocketService: WebSocketService;
  let httpServer: any;
  let mockSockets: any;

  beforeEach(() => {
    jest.clearAllMocks();
    httpServer = createServer();
    mockSockets = {
      on: jest.fn(),
      emit: jest.fn(),
    };
    webSocketService = new WebSocketService();
  });

  it("should initialize WebSocket server", () => {
    webSocketService.init(httpServer, mockSockets);

    expect(mockSockets.on).toHaveBeenCalledWith(
      "connect",
      expect.any(Function),
    );
  });

  it("should send log message", () => {
    webSocketService.init(httpServer, mockSockets);
    const logMessage = { level: "info", message: "test message" };

    webSocketService.sendLog(logMessage);
    expect(mockSockets.emit).toHaveBeenCalledWith("log", logMessage);
  });

  it("should handle log event", () => {
    webSocketService.init(httpServer, mockSockets);
    const logMessage = {
      level: "info",
      message: "test message",
      label: "test",
      timestamp: new Date(),
    };

    webSocketService.onLog(logMessage);
    //expect(mockSockets.emit).toHaveBeenCalledWith('logged', logMessage);
    expect(mockSockets.emit).toHaveBeenCalledWith(
      "log",
      expect.objectContaining({ id: "uuid-v4" }),
    );
  });
});
