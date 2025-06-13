import { Server as SocketIOServer, Socket } from "socket.io";
import WebSocketService from "../../application/WebSocketService";
import { loggerFactory, LogEventTransport } from "../../utils/logger";
import { ProxyConfig } from "../../utils/utils";

// Mock dependencies
jest.mock("socket.io", () => {
  // Create mock namespace
  const mockNamespace = {
    on: jest.fn(),
    emit: jest.fn(),
  };

  // Create mock server with of method
  const mockOf = jest.fn().mockReturnValue(mockNamespace);
  const mockServer = {
    of: mockOf,
  };

  // Export mock Server constructor
  return {
    Server: jest.fn().mockImplementation(() => mockServer),
  };
});

jest.mock("../../utils/logger", () => {
  return {
    loggerFactory: {
      getLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
      addTransport: jest.fn(),
    },
    LogEventTransport: jest.fn(),
  };
});

jest.mock("../../utils/utils", () => ({
  ProxyConfig: {
    getSocketNamespace: jest.fn().mockReturnValue("/test-namespace"),
  },
}));

describe("WebSocketService", () => {
  let webSocketService: WebSocketService;
  let mockServer: any;
  let mockNamespace: any;
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    webSocketService = new WebSocketService();

    // Setup mock socket for connection event
    mockSocket = {
      on: jest.fn(),
      id: "test-socket-id",
      data: {},
    };
  });

  // Helper function to initialize the service and get mocks
  const initServiceAndGetMocks = () => {
    const httpServer = {};
    webSocketService.init(httpServer);

    // Get mock server instance
    mockServer = (SocketIOServer as unknown as jest.Mock).mock.results[0].value;

    // Get mock namespace
    mockNamespace = mockServer.of("/test-namespace");

    return { httpServer };
  };

  describe("init", () => {
    it("should initialize the WebSocket server", () => {
      // Arrange & Act
      const { httpServer } = initServiceAndGetMocks();

      // Assert
      expect(SocketIOServer).toHaveBeenCalledWith(httpServer, {
        path: "/socket.io",
      });
      expect(mockServer.of).toHaveBeenCalledWith("/test-namespace");
      expect(mockNamespace.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function),
      );
      expect(loggerFactory.addTransport).toHaveBeenCalledWith(
        expect.any(LogEventTransport),
      );
    });

    it("should set up socket event handlers on connection", () => {
      // Arrange
      initServiceAndGetMocks();

      // Get the connect handler
      const connectHandler = mockNamespace.on.mock.calls[0][1];

      // Act - simulate a connection
      connectHandler(mockSocket);

      // Assert
      expect(mockSocket.on).toHaveBeenCalledWith(
        "getAllLogs",
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith("ping", expect.any(Function));
    });

    it("should handle ping event", () => {
      // Arrange
      initServiceAndGetMocks();

      // Get the connect handler and call it with the mock socket
      const connectHandler = mockNamespace.on.mock.calls[0][1];
      connectHandler(mockSocket);

      // Get the ping handler
      const pingHandlers = mockSocket.on.mock.calls.filter(
        (call) => call[0] === "ping",
      );
      const pingHandler = pingHandlers[0][1];

      // Act
      pingHandler();

      // Assert
      const logger = loggerFactory.getLogger("WEBSOCKET");
      expect(logger.info).toHaveBeenCalledWith("ping");
    });
  });

  describe("sendLog", () => {
    it("should emit log event with the message", () => {
      // Arrange
      initServiceAndGetMocks();
      const message = { level: "info", message: "Test message" };

      // Act
      webSocketService.sendLog(message);

      // Assert
      expect(mockNamespace.emit).toHaveBeenCalledWith("log", message);
    });
  });

  describe("getAllLogs", () => {
    it("should send all stored messages", () => {
      // Arrange
      initServiceAndGetMocks();

      // Add some messages to the service
      const message1 = { id: "1", level: "info", value: "Test message 1" };
      const message2 = { id: "2", level: "error", value: "Test message 2" };

      // Use private property access to add messages to the set
      (webSocketService as any).messages.add(message1);
      (webSocketService as any).messages.add(message2);

      // Spy on sendLog method
      const sendLogSpy = jest.spyOn(webSocketService, "sendLog");

      // Act
      webSocketService.getAllLogs();

      // Assert
      expect(sendLogSpy).toHaveBeenCalledTimes(2);
      expect(sendLogSpy).toHaveBeenCalledWith(message1);
      expect(sendLogSpy).toHaveBeenCalledWith(message2);
    });
  });

  describe("onLog", () => {
    it("should add log event to messages and emit it", () => {
      // Arrange
      initServiceAndGetMocks();
      const logEvent = {
        level: "info",
        message: "Test log message",
        label: "TEST",
        timestamp: new Date().toISOString(),
      };

      // Spy on sendLog method
      const sendLogSpy = jest.spyOn(webSocketService, "sendLog");

      // Act
      webSocketService.onLog(logEvent);

      // Assert - check that the message was added to the messages set
      expect((webSocketService as any).messages.size).toBe(1);

      // Check that the log event was emitted (sendLog calls emit with 'log')
      expect(mockNamespace.emit).toHaveBeenCalledWith(
        "log",
        expect.objectContaining({
          id: expect.any(String),
          level: logEvent.level,
          value: logEvent.message,
          label: logEvent.label,
          time: logEvent.timestamp,
        }),
      );

      // Note: The 'logged' event is emitted via setImmediate, which is asynchronous
      // and not easily testable in this synchronous test

      // Check that sendLog was called with a log event object
      expect(sendLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          level: logEvent.level,
          value: logEvent.message,
          label: logEvent.label,
          time: logEvent.timestamp,
        }),
      );
    });
  });

  describe("disconnect", () => {
    it("should log disconnect message", () => {
      // Act
      webSocketService.disconnect();

      // Assert
      const logger = loggerFactory.getLogger("WEBSOCKET");
      expect(logger.info).toHaveBeenCalledWith("disconnect");
    });
  });
});
