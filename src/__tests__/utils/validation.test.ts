import {
  validateMqttTopic,
  validateDeviceId,
  validateFilePath,
  validateQoS,
  validateMqttProtocolVersion,
  sanitizeString,
  validatePort,
} from "../../utils/validation";

// Mock fs module
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe("Validation Utils", () => {
  describe("validateMqttTopic", () => {
    it("should return true for valid topics", () => {
      // Act & Assert
      expect(validateMqttTopic("rfxcom/device/123", "rfxcom")).toBe(true);
    });

    it("should return false for topics with different base", () => {
      // Act & Assert
      expect(validateMqttTopic("zigbee/device/123", "rfxcom")).toBe(false);
    });

    it("should return false for empty topics", () => {
      // Act & Assert
      expect(validateMqttTopic("", "rfxcom")).toBe(false);
    });

    it("should return false for empty base topics", () => {
      // Act & Assert
      expect(validateMqttTopic("rfxcom/device/123", "")).toBe(false);
    });
  });

  describe("validateDeviceId", () => {
    it("should return true for valid device IDs", () => {
      // Act & Assert
      expect(validateDeviceId("device123")).toBe(true);
    });

    it("should return false for device IDs with invalid characters", () => {
      // Act & Assert
      expect(validateDeviceId("device/123")).toBe(false);
      expect(validateDeviceId("device:123")).toBe(false);
      expect(validateDeviceId("device*123")).toBe(false);
    });

    it("should return false for empty device IDs", () => {
      // Act & Assert
      expect(validateDeviceId("")).toBe(false);
    });

    it("should return false for non-string device IDs", () => {
      // Act & Assert
      expect(validateDeviceId(null as unknown as string)).toBe(false);
      expect(validateDeviceId(undefined as unknown as string)).toBe(false);
    });
  });

  describe("validateFilePath", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return true for valid file paths", () => {
      // Arrange
      const fs = require("fs");
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => true });

      // Act & Assert
      expect(validateFilePath("/path/to/file.txt")).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith("/path/to/file.txt");
      expect(fs.statSync).toHaveBeenCalledWith("/path/to/file.txt");
    });

    it("should return false for non-existent files", () => {
      // Arrange
      const fs = require("fs");
      fs.existsSync.mockReturnValue(false);

      // Act & Assert
      expect(validateFilePath("/path/to/nonexistent.txt")).toBe(false);
    });

    it("should return false for directories", () => {
      // Arrange
      const fs = require("fs");
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => false });

      // Act & Assert
      expect(validateFilePath("/path/to/directory")).toBe(false);
    });

    it("should return false and log error when exception occurs", () => {
      // Arrange
      const fs = require("fs");
      const logger = require("../../utils/logger").logger;
      fs.existsSync.mockImplementation(() => {
        throw new Error("Test error");
      });

      // Act & Assert
      expect(validateFilePath("/path/to/file.txt")).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Test error"),
      );
    });

    it("should return false for empty paths", () => {
      // Act & Assert
      expect(validateFilePath("")).toBe(false);
    });

    it("should return false for non-string paths", () => {
      // Act & Assert
      expect(validateFilePath(null as unknown as string)).toBe(false);
      expect(validateFilePath(undefined as unknown as string)).toBe(false);
    });
  });

  describe("validateQoS", () => {
    it("should return true for valid QoS values", () => {
      // Act & Assert
      expect(validateQoS(0)).toBe(true);
      expect(validateQoS(1)).toBe(true);
      expect(validateQoS(2)).toBe(true);
    });

    it("should return false for invalid QoS values", () => {
      // Act & Assert
      expect(validateQoS(-1)).toBe(false);
      expect(validateQoS(3)).toBe(false);
      expect(validateQoS(1.5)).toBe(false);
    });
  });

  describe("validateMqttProtocolVersion", () => {
    it("should return true for valid MQTT protocol versions", () => {
      // Act & Assert
      expect(validateMqttProtocolVersion(3)).toBe(true);
      expect(validateMqttProtocolVersion(4)).toBe(true);
      expect(validateMqttProtocolVersion(5)).toBe(true);
    });

    it("should return false for invalid MQTT protocol versions", () => {
      // Act & Assert
      expect(validateMqttProtocolVersion(2)).toBe(false);
      expect(validateMqttProtocolVersion(6)).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("should sanitize strings with invalid characters", () => {
      // Act & Assert
      expect(sanitizeString("Device/123")).toBe("device_123");
      expect(sanitizeString("Device:123")).toBe("device_123");
      expect(sanitizeString("Device*123")).toBe("device_123");
    });

    it("should replace spaces with underscores", () => {
      // Act & Assert
      expect(sanitizeString("Device 123")).toBe("device_123");
      expect(sanitizeString("  Device  123  ")).toBe("device_123");
    });

    it("should convert to lowercase", () => {
      // Act & Assert
      expect(sanitizeString("DEVICE123")).toBe("device123");
    });

    it("should return empty string for empty input", () => {
      // Act & Assert
      expect(sanitizeString("")).toBe("");
    });

    it("should return empty string for non-string input", () => {
      // Act & Assert
      expect(sanitizeString(null as unknown as string)).toBe("");
      expect(sanitizeString(undefined as unknown as string)).toBe("");
    });
  });

  describe("validatePort", () => {
    it("should return true for valid port numbers", () => {
      // Act & Assert
      expect(validatePort(1)).toBe(true);
      expect(validatePort(80)).toBe(true);
      expect(validatePort(8080)).toBe(true);
      expect(validatePort(65535)).toBe(true);
    });

    it("should return true for valid port numbers as strings", () => {
      // Act & Assert
      expect(validatePort("1")).toBe(true);
      expect(validatePort("80")).toBe(true);
      expect(validatePort("8080")).toBe(true);
      expect(validatePort("65535")).toBe(true);
    });

    it("should return false for invalid port numbers", () => {
      // Act & Assert
      expect(validatePort(0)).toBe(false);
      expect(validatePort(-1)).toBe(false);
      expect(validatePort(65536)).toBe(false);
    });

    it("should return false for invalid port numbers as strings", () => {
      // Act & Assert
      expect(validatePort("0")).toBe(false);
      expect(validatePort("-1")).toBe(false);
      expect(validatePort("65536")).toBe(false);
      expect(validatePort("abc")).toBe(false);
    });
  });
});
