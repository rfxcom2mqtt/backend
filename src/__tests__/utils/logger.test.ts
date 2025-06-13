import winston from "winston";

import {
  LogEventTransport,
  LogEventListener,
  loggerFactory,
} from "../../utils/logger";

// Mock winston
jest.mock("winston", () => {
  const mockFormat = {
    combine: jest.fn().mockReturnThis(),
    label: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    printf: jest.fn().mockReturnThis(),
    colorize: jest.fn().mockReturnThis(),
  };

  const mockLogger = {
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    add: jest.fn(),
    transports: [],
  };

  return {
    format: mockFormat,
    createLogger: jest.fn().mockReturnValue(mockLogger),
    transports: {
      Console: jest.fn().mockImplementation(() => ({
        level: "info",
      })),
    },
  };
});

describe("Logger", () => {
  describe("LogEventTransport", () => {
    it("should call the listener when logging", () => {
      // Arrange
      const mockListener: LogEventListener = {
        onLog: jest.fn(),
      };
      const transport = new LogEventTransport(mockListener);
      const logInfo = { level: "info", message: "Test message" };
      const callback = jest.fn();

      // Act
      transport.log(logInfo, callback);

      // Assert
      expect(mockListener.onLog).toHaveBeenCalledWith(logInfo);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("Logger class", () => {
    let logger: any;
    let mockWinstonLogger: any;

    beforeEach(() => {
      jest.clearAllMocks();
      // Access the private logger instance
      logger = new (require("../../utils/logger").Logger)("TestLogger");
      mockWinstonLogger = (winston.createLogger as jest.Mock).mock.results[0]
        .value;
    });

    it("should create a logger with the correct name", () => {
      // Assert
      expect(logger.name).toBe("TestLogger");
      expect(winston.createLogger).toHaveBeenCalled();
      expect(winston.format.label).toHaveBeenCalledWith({
        label: "TestLogger",
      });
    });

    it("should log warning messages", () => {
      // Act
      logger.warn("Warning message");

      // Assert
      expect(mockWinstonLogger.warning).toHaveBeenCalledWith("Warning message");
    });

    it("should log warning messages with warning method", () => {
      // Act
      logger.warning("Warning message");

      // Assert
      expect(mockWinstonLogger.warning).toHaveBeenCalledWith("Warning message");
    });

    it("should log info messages", () => {
      // Act
      logger.info("Info message");

      // Assert
      expect(mockWinstonLogger.info).toHaveBeenCalledWith("Info message");
    });

    it("should log debug messages", () => {
      // Act
      logger.debug("Debug message");

      // Assert
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith("Debug message");
    });

    it("should log error messages", () => {
      // Act
      logger.error("Error message");

      // Assert
      expect(mockWinstonLogger.error).toHaveBeenCalledWith("Error message");
    });

    it("should add a transport", () => {
      // Arrange
      const mockTransport = {};

      // Act
      logger.addTransport(mockTransport);

      // Assert
      expect(mockWinstonLogger.add).toHaveBeenCalledWith(mockTransport);
    });

    it("should set log level for all transports", () => {
      // Arrange
      const mockTransport1 = { level: "info" };
      const mockTransport2 = { level: "debug" };
      mockWinstonLogger.transports = [mockTransport1, mockTransport2];

      // Act
      logger.setLevel("error");

      // Assert
      expect(mockTransport1.level).toBe("error");
      expect(mockTransport2.level).toBe("error");
    });

    it("should get the current log level", () => {
      // Arrange
      const mockTransport = { level: "info" };
      logger.transportsToUse = [mockTransport];

      // Act & Assert
      expect(logger.getLevel()).toBe("info");
    });
  });

  describe("LoggerFactory", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should create a new logger when one does not exist", () => {
      // Act
      const logger1 = loggerFactory.getLogger("Logger1");
      const logger2 = loggerFactory.getLogger("Logger2");

      // Assert
      expect(logger1).not.toBe(logger2);
      expect(logger1.name).toBe("Logger1");
      expect(logger2.name).toBe("Logger2");
    });

    it("should return an existing logger when one exists", () => {
      // Act
      const logger1 = loggerFactory.getLogger("Logger1");
      const logger1Again = loggerFactory.getLogger("Logger1");

      // Assert
      expect(logger1).toBe(logger1Again);
    });

    it("should set level for all loggers", () => {
      // Arrange
      const logger1 = loggerFactory.getLogger("Logger1");
      const logger2 = loggerFactory.getLogger("Logger2");
      const setLevelSpy1 = jest.spyOn(logger1, "setLevel");
      const setLevelSpy2 = jest.spyOn(logger2, "setLevel");

      // Act
      loggerFactory.setLevel("debug");

      // Assert
      expect(setLevelSpy1).toHaveBeenCalledWith("debug");
      expect(setLevelSpy2).toHaveBeenCalledWith("debug");
    });

    it("should add transport to all loggers", () => {
      // Arrange
      const logger1 = loggerFactory.getLogger("Logger1");
      const logger2 = loggerFactory.getLogger("Logger2");
      const addTransportSpy1 = jest.spyOn(logger1, "addTransport");
      const addTransportSpy2 = jest.spyOn(logger2, "addTransport");
      const mockTransport = {};

      // Act
      loggerFactory.addTransport(mockTransport as winston.transport);

      // Assert
      expect(addTransportSpy1).toHaveBeenCalledWith(mockTransport);
      expect(addTransportSpy2).toHaveBeenCalledWith(mockTransport);
    });

    it("should get the default logger", () => {
      // Act
      const defaultLogger = loggerFactory.getDefault();

      // Assert
      expect(defaultLogger).toBeDefined();
      expect(defaultLogger.name).toBe("GATEWAY");
    });
  });
});
