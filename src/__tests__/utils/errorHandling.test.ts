import {
  ApplicationError,
  ConfigurationError,
  MqttConnectionError,
  RfxcomError,
  isApplicationError,
  safeExecute,
} from "../../utils/errorHandling";

describe("Error Handling Utils", () => {
  describe("ApplicationError", () => {
    it("should create an error with the correct properties", () => {
      // Arrange
      const message = "Test error message";
      const code = "TEST_ERROR";
      const context = { foo: "bar" };

      // Act
      const error = new ApplicationError(message, code, context);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApplicationError");
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.context).toEqual(context);
    });
  });

  describe("MqttConnectionError", () => {
    it("should create an error with the correct properties", () => {
      // Arrange
      const message = "MQTT connection failed";
      const context = { broker: "localhost" };

      // Act
      const error = new MqttConnectionError(message, context);

      // Assert
      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.name).toBe("MqttConnectionError");
      expect(error.message).toBe(message);
      expect(error.code).toBe("MQTT_CONNECTION_ERROR");
      expect(error.context).toEqual(context);
    });
  });

  describe("RfxcomError", () => {
    it("should create an error with the correct properties", () => {
      // Arrange
      const message = "RFXCOM device error";
      const context = { device: "/dev/ttyUSB0" };

      // Act
      const error = new RfxcomError(message, context);

      // Assert
      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.name).toBe("RfxcomError");
      expect(error.message).toBe(message);
      expect(error.code).toBe("RFXCOM_ERROR");
      expect(error.context).toEqual(context);
    });
  });

  describe("ConfigurationError", () => {
    it("should create an error with the correct properties", () => {
      // Arrange
      const message = "Invalid configuration";
      const context = { config: "mqtt" };

      // Act
      const error = new ConfigurationError(message, context);

      // Assert
      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.name).toBe("ConfigurationError");
      expect(error.message).toBe(message);
      expect(error.code).toBe("CONFIGURATION_ERROR");
      expect(error.context).toEqual(context);
    });
  });

  describe("safeExecute", () => {
    it("should resolve with the operation result when successful", async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue("success");

      // Act
      const result = await safeExecute(operation, "Operation failed");

      // Assert
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalled();
    });

    it("should throw ApplicationError when operation fails", async () => {
      // Arrange
      const originalError = new Error("Original error");
      const operation = jest.fn().mockRejectedValue(originalError);
      const errorMessage = "Operation failed";
      const context = { foo: "bar" };

      // Act & Assert
      await expect(
        safeExecute(operation, errorMessage, context),
      ).rejects.toThrow(ApplicationError);

      await expect(
        safeExecute(operation, errorMessage, context),
      ).rejects.toMatchObject({
        message: `${errorMessage}: ${originalError.message}`,
        code: "OPERATION_FAILED",
        context: expect.objectContaining({
          ...context,
          originalError,
        }),
      });
    });

    it("should include non-Error rejection values in the error message", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue("string error");
      const errorMessage = "Operation failed";

      // Act & Assert
      await expect(safeExecute(operation, errorMessage)).rejects.toMatchObject({
        message: `${errorMessage}: string error`,
        code: "OPERATION_FAILED",
      });
    });
  });

  describe("isApplicationError", () => {
    it("should return true for ApplicationError instances", () => {
      // Arrange
      const error = new ApplicationError("Test error", "TEST_ERROR");

      // Act & Assert
      expect(isApplicationError(error)).toBe(true);
    });

    it("should return true for subclasses of ApplicationError", () => {
      // Arrange
      const mqttError = new MqttConnectionError("MQTT error");
      const rfxcomError = new RfxcomError("RFXCOM error");
      const configError = new ConfigurationError("Config error");

      // Act & Assert
      expect(isApplicationError(mqttError)).toBe(true);
      expect(isApplicationError(rfxcomError)).toBe(true);
      expect(isApplicationError(configError)).toBe(true);
    });

    it("should return false for standard Error instances", () => {
      // Arrange
      const error = new Error("Standard error");

      // Act & Assert
      expect(isApplicationError(error)).toBe(false);
    });

    it("should return false for non-error values", () => {
      // Act & Assert
      expect(isApplicationError("string")).toBe(false);
      expect(isApplicationError(123)).toBe(false);
      expect(isApplicationError(null)).toBe(false);
      expect(isApplicationError(undefined)).toBe(false);
      expect(isApplicationError({})).toBe(false);
    });
  });
});
