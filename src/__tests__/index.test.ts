// @ts-nocheck
import { jest } from "@jest/globals";

// Mock dependencies
jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

// Mock Controller
jest.mock("../core/Controller", () => {
  const mockStart = jest.fn().mockResolvedValue(undefined);
  const mockStop = jest.fn().mockResolvedValue(undefined);

  const mockController = jest.fn().mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
  }));

  return {
    __esModule: true,
    default: mockController,
  };
});

jest.mock("../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("index.ts", () => {
  // Store original process properties
  const originalArgv = process.argv;
  const originalOn = process.on;
  const originalExit = process.exit;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock process.exit
    process.exit = jest.fn();

    // Mock process.on
    process.on = jest.fn();

    // Reset process.argv
    process.argv = [...originalArgv];
  });

  afterEach(() => {
    // Restore original process properties
    process.argv = originalArgv;
    process.on = originalOn;
    process.exit = originalExit;

    // Clear module cache to allow re-importing
    jest.resetModules();
  });

  describe("getEnvironmentFile", () => {
    it("should use default .env file when no env-file argument is provided", () => {
      // Import the module to trigger the code
      require("../index");

      // Check if dotenv.config was called with the default path
      const dotenv = require("dotenv");
      expect(dotenv.config).toHaveBeenCalledWith({ path: ".env" });
    });

    it("should use specified env file when env-file argument is provided", () => {
      // Set up process.argv with custom env file
      process.argv = [...originalArgv, "--env-file=.env.test"];

      // Import the module to trigger the code
      require("../index");

      // Check if dotenv.config was called with the specified path
      const dotenv = require("dotenv");
      expect(dotenv.config).toHaveBeenCalledWith({ path: ".env.test" });
    });
  });

  describe("signal handlers", () => {
    it("should register handlers for SIGINT and SIGTERM", () => {
      // Import the module to trigger the code
      require("../index");

      // Check if process.on was called for SIGINT and SIGTERM
      expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
      expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    });

    it("should register handlers for uncaughtException and unhandledRejection", () => {
      // Import the module to trigger the code
      require("../index");

      // Check if process.on was called for uncaughtException and unhandledRejection
      expect(process.on).toHaveBeenCalledWith(
        "uncaughtException",
        expect.any(Function),
      );
      expect(process.on).toHaveBeenCalledWith(
        "unhandledRejection",
        expect.any(Function),
      );
    });
  });

  describe("handleExit", () => {
    it("should call process.exit with the provided exit code when shouldRestart is false", () => {
      // Import the module to trigger the code
      require("../index");

      // Since we can't directly access private functions, we'll test this indirectly
      // by triggering an uncaught exception
      const mockCalls = process.on.mock.calls;
      const uncaughtExceptionHandler = mockCalls.find(
        (call) => call[0] === "uncaughtException",
      )?.[1];

      if (uncaughtExceptionHandler) {
        // Trigger the handler with a mock error
        uncaughtExceptionHandler(new Error("Test error"));

        // Check if process.exit was called with exit code 1
        expect(process.exit).toHaveBeenCalledWith(1);
      } else {
        // Use Jest's expect to fail the test if handler not found
        expect("Uncaught exception handler not found").toBe(false);
      }
    });
  });

  describe("startApplication", () => {
    it("should create and start a Controller instance", async () => {
      // Import the module to trigger the code
      require("../index");

      // Check if Controller was instantiated
      const Controller = require("../core/Controller").default;
      expect(Controller).toHaveBeenCalled();

      // Get the mock instance
      const mockInstance = Controller.mock.results[0].value;
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it("should exit with code 1 if starting the application fails", async () => {
      // Reset modules to clear previous test state
      jest.resetModules();

      // Mock Controller to throw an error when start is called
      jest.mock("../core/Controller", () => {
        const mockStart = jest
          .fn()
          .mockRejectedValue(new Error("Start failed"));
        const mockStop = jest.fn().mockResolvedValue(undefined);

        const mockController = jest.fn().mockImplementation(() => ({
          start: mockStart,
          stop: mockStop,
        }));

        return {
          __esModule: true,
          default: mockController,
        };
      });

      // Import the module to trigger the code
      require("../index");

      // Wait for the promise rejection to be handled
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Check if process.exit was called with exit code 1
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
