// @ts-nocheck
import { jest } from "@jest/globals";
import { ConfigurationError } from "../../utils/errorHandling";

import {
  sanitizeConfigForLogging,
  validateApplicationConfig,
  validateCronExpression,
  validateFilePath,
  validateLogLevel,
  validateMqttConfig,
  validatePort,
} from "../../config/settings/config.validation";

// Mock dependencies
jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
}));

describe("Config Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateMqttConfig", () => {
    it("should validate a correct MQTT configuration", () => {
      // Arrange
      const config = {
        server: "mqtt://localhost",
        base_topic: "rfxcom",
        port: 1883,
        qos: 0,
        retain: true,
        include_device_information: true,
      };

      // Act
      const result = validateMqttConfig(config);

      // Assert
      expect(result).toEqual({
        server: "mqtt://localhost",
        base_topic: "rfxcom",
        port: 1883,
        qos: 0,
        retain: true,
        include_device_information: true,
        username: undefined,
        password: undefined,
        key: undefined,
        ca: undefined,
        cert: undefined,
        keepalive: undefined,
        client_id: undefined,
        reject_unauthorized: undefined,
        version: undefined,
      });
    });

    it("should throw ConfigurationError when server is missing", () => {
      // Arrange
      const config = {
        base_topic: "rfxcom",
      };

      // Act & Assert
      expect(() => validateMqttConfig(config)).toThrow(ConfigurationError);
      expect(() => validateMqttConfig(config)).toThrow(
        "MQTT server is required",
      );
    });

    it("should throw ConfigurationError when base_topic is missing", () => {
      // Arrange
      const config = {
        server: "mqtt://localhost",
      };

      // Act & Assert
      expect(() => validateMqttConfig(config)).toThrow(ConfigurationError);
      expect(() => validateMqttConfig(config)).toThrow(
        "MQTT base_topic is required",
      );
    });

    it("should throw ConfigurationError when port is invalid", () => {
      // Arrange
      const config = {
        server: "mqtt://localhost",
        base_topic: "rfxcom",
        port: 70000,
      };

      // Act & Assert
      expect(() => validateMqttConfig(config)).toThrow(ConfigurationError);
      expect(() => validateMqttConfig(config)).toThrow(
        "MQTT port must be between 1 and 65535",
      );
    });

    it("should throw ConfigurationError when QoS is invalid", () => {
      // Arrange
      const config = {
        server: "mqtt://localhost",
        base_topic: "rfxcom",
        qos: 3,
      };

      // Act & Assert
      expect(() => validateMqttConfig(config)).toThrow(ConfigurationError);
      expect(() => validateMqttConfig(config)).toThrow(
        "MQTT QoS must be 0, 1, or 2",
      );
    });

    it("should throw ConfigurationError when version is invalid", () => {
      // Arrange
      const config = {
        server: "mqtt://localhost",
        base_topic: "rfxcom",
        version: 6,
      };

      // Act & Assert
      expect(() => validateMqttConfig(config)).toThrow(ConfigurationError);
      expect(() => validateMqttConfig(config)).toThrow(
        "MQTT version must be 3, 4, or 5",
      );
    });

    it("should throw ConfigurationError with multiple errors", () => {
      // Arrange
      const config = {
        qos: 3,
        version: 6,
      };

      // Act & Assert
      expect(() => validateMqttConfig(config)).toThrow(ConfigurationError);
      expect(() => validateMqttConfig(config)).toThrow(
        /MQTT server is required.*MQTT base_topic is required.*MQTT QoS must be 0, 1, or 2.*MQTT version must be 3, 4, or 5/,
      );
    });
  });

  describe("validateLogLevel", () => {
    it("should validate correct log levels", () => {
      // Act & Assert
      expect(validateLogLevel("error")).toBe("error");
      expect(validateLogLevel("warn")).toBe("warn");
      expect(validateLogLevel("info")).toBe("info");
      expect(validateLogLevel("debug")).toBe("debug");
    });

    it("should throw ConfigurationError for invalid log level", () => {
      // Act & Assert
      expect(() => validateLogLevel("trace")).toThrow(ConfigurationError);
      expect(() => validateLogLevel("trace")).toThrow(
        "Invalid log level: trace",
      );
    });
  });

  describe("validateCronExpression", () => {
    it("should validate correct cron expressions", () => {
      // Act & Assert
      expect(validateCronExpression("* * * * *")).toBe(true);
      expect(validateCronExpression("0 0 * * *")).toBe(true);
      expect(validateCronExpression("0 0 * * * *")).toBe(true);
    });

    it("should throw ConfigurationError for invalid cron expressions", () => {
      // Act & Assert
      expect(() => validateCronExpression("* * *")).toThrow(ConfigurationError);
      expect(() => validateCronExpression("* * *")).toThrow(
        "Invalid cron expression",
      );
      expect(() => validateCronExpression("* * * * * * *")).toThrow(
        ConfigurationError,
      );
    });
  });

  describe("validatePort", () => {
    it("should validate correct port numbers", () => {
      // Act & Assert
      expect(validatePort(1)).toBe(1);
      expect(validatePort(80)).toBe(80);
      expect(validatePort(8080)).toBe(8080);
      expect(validatePort(65535)).toBe(65535);
    });

    it("should throw ConfigurationError for invalid port numbers", () => {
      // Act & Assert
      expect(() => validatePort(0)).toThrow(ConfigurationError);
      expect(() => validatePort(0)).toThrow(
        "Port must be an integer between 1 and 65535",
      );
      expect(() => validatePort(65536)).toThrow(ConfigurationError);
      expect(() => validatePort(65536)).toThrow(
        "Port must be an integer between 1 and 65535",
      );
      expect(() => validatePort(3.14)).toThrow(ConfigurationError);
    });

    it("should use custom name in error message", () => {
      // Act & Assert
      expect(() => validatePort(0, "Web port")).toThrow(
        "Web port must be an integer between 1 and 65535",
      );
    });
  });

  describe("validateFilePath", () => {
    const fs = require("fs");

    it("should validate existing file paths", () => {
      // Arrange
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => true });

      // Act & Assert
      expect(validateFilePath("/path/to/file", "Test file")).toBe(
        "/path/to/file",
      );
      expect(fs.existsSync).toHaveBeenCalledWith("/path/to/file");
      expect(fs.statSync).toHaveBeenCalledWith("/path/to/file");
    });

    it("should throw ConfigurationError when file does not exist", () => {
      // Arrange
      fs.existsSync.mockReturnValue(false);

      // Act & Assert
      expect(() =>
        validateFilePath("/path/to/nonexistent", "Test file"),
      ).toThrow(ConfigurationError);
      expect(() =>
        validateFilePath("/path/to/nonexistent", "Test file"),
      ).toThrow("Test file file not found: /path/to/nonexistent");
    });

    it("should throw ConfigurationError when path is not a file", () => {
      // Arrange
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => false });

      // Act & Assert
      expect(() => validateFilePath("/path/to/directory", "Test file")).toThrow(
        ConfigurationError,
      );
      expect(() => validateFilePath("/path/to/directory", "Test file")).toThrow(
        "Test file path is not a file: /path/to/directory",
      );
    });

    it("should handle and wrap other errors", () => {
      // Arrange
      fs.existsSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      // Act & Assert
      expect(() => validateFilePath("/path/to/file", "Test file")).toThrow(
        ConfigurationError,
      );
      expect(() => validateFilePath("/path/to/file", "Test file")).toThrow(
        "Error accessing Test file file: /path/to/file",
      );
    });
  });

  describe("validateApplicationConfig", () => {
    const { logger } = require("../../utils/logger");

    it("should validate a complete application configuration", () => {
      // Arrange
      const config = {
        mqtt: {
          server: "mqtt://localhost",
          base_topic: "rfxcom",
          port: 1883,
        },
        loglevel: "info",
        healthcheck: {
          enabled: true,
          cron: "0 0 * * *",
        },
        frontend: {
          enabled: true,
          port: 8080,
        },
      };

      // Act
      const result = validateApplicationConfig(config);

      // Assert
      expect(result).toEqual({
        mqtt: {
          server: "mqtt://localhost",
          base_topic: "rfxcom",
          port: 1883,
          retain: false,
          qos: 0,
          include_device_information: undefined,
          username: undefined,
          password: undefined,
          key: undefined,
          ca: undefined,
          cert: undefined,
          keepalive: undefined,
          client_id: undefined,
          reject_unauthorized: undefined,
          version: undefined,
        },
        loglevel: "info",
        healthcheck: {
          enabled: true,
          cron: "0 0 * * *",
        },
        frontend: {
          enabled: true,
          port: 8080,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        "Application configuration validated successfully",
      );
    });

    it("should validate SSL certificate paths", () => {
      // Arrange
      const fs = require("fs");
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => true });

      const config = {
        mqtt: {
          server: "mqtt://localhost",
          base_topic: "rfxcom",
          ca: "/path/to/ca.pem",
          key: "/path/to/key.pem",
          cert: "/path/to/cert.pem",
        },
      };

      // Act
      validateApplicationConfig(config);

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith("/path/to/ca.pem");
      expect(fs.existsSync).toHaveBeenCalledWith("/path/to/key.pem");
      expect(fs.existsSync).toHaveBeenCalledWith("/path/to/cert.pem");
    });

    it("should log and rethrow errors", () => {
      // Arrange
      const config = {
        mqtt: {
          // Missing required fields
        },
      };

      // Act & Assert
      expect(() => validateApplicationConfig(config)).toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("sanitizeConfigForLogging", () => {
    it("should sanitize sensitive information", () => {
      // Arrange
      const config = {
        mqtt: {
          server: "mqtt://localhost",
          username: "admin",
          password: "secret123",
        },
        other: "value",
      };

      // Act
      const sanitized = sanitizeConfigForLogging(config);

      // Assert
      expect(sanitized).toEqual({
        mqtt: {
          server: "mqtt://localhost",
          username: "***",
          password: "***",
        },
        other: "value",
      });
      // Original config should not be modified
      expect(config.mqtt.username).toBe("admin");
      expect(config.mqtt.password).toBe("secret123");
    });

    it("should handle missing sensitive fields", () => {
      // Arrange
      const config = {
        mqtt: {
          server: "mqtt://localhost",
        },
      };

      // Act
      const sanitized = sanitizeConfigForLogging(config);

      // Assert
      expect(sanitized).toEqual({
        mqtt: {
          server: "mqtt://localhost",
        },
      });
    });
  });
});
