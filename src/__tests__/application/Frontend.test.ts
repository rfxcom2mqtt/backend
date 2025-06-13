import { Router } from "express";
import expressStaticGzip from "express-static-gzip";
import fs from "fs";
import path from "path";
import Frontend from "../../application/Frontend";
import { loggerFactory } from "../../utils/logger";
import { ProxyConfig } from "../../utils/utils";

// Mock dependencies
jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
  readdir: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn().mockImplementation((...args) => args.join("/")),
}));

jest.mock("express", () => ({
  Router: jest.fn().mockReturnValue({
    use: jest.fn(),
  }),
}));

jest.mock("express-static-gzip", () => {
  return jest.fn().mockReturnValue("mock-express-static-gzip");
});

jest.mock("serve-static", () => {
  return jest.fn().mockReturnValue("mock-serve-static");
});

jest.mock(
  "@rfxcom2mqtt/frontend",
  () => ({
    setConfig: jest.fn(),
    getPath: jest.fn().mockReturnValue("/mock/frontend/path"),
  }),
  { virtual: true },
);

jest.mock("../../utils/utils", () => ({
  ProxyConfig: {
    getBasePath: jest.fn().mockReturnValue("/api"),
    getSocketNamespace: jest.fn().mockReturnValue("/socket"),
  },
}));

jest.mock("../../utils/logger", () => ({
  loggerFactory: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe("Frontend", () => {
  let frontend: Frontend;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should initialize with production frontend when PROFILE is not development", () => {
      // Arrange
      delete process.env.PROFILE;

      // Act
      frontend = new Frontend();

      // Assert
      expect(Router).toHaveBeenCalled();
      expect(expressStaticGzip).toHaveBeenCalledWith(
        "/mock/frontend/path",
        expect.any(Object),
      );
      expect(frontend.router.use).toHaveBeenCalledWith(
        "mock-express-static-gzip",
      );
      expect(frontend.pathStatic).toBe("/mock/frontend/path");
    });

    it("should initialize with development frontend when PROFILE is development", () => {
      // Arrange
      process.env.PROFILE = "development";
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Act
      frontend = new Frontend();

      // Assert
      expect(Router).toHaveBeenCalled();
      expect(path.join).toHaveBeenCalledWith(
        expect.any(String),
        "../../../frontend/build/",
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "utf8",
      );
      expect(frontend.router.use).toHaveBeenCalledWith("mock-serve-static");
      // The pathStatic should be the joined path from __dirname and buildPath
      expect(typeof frontend.pathStatic).toBe("string");
    });
  });

  describe("getFrontEndConfig", () => {
    it("should return the correct frontend config", () => {
      // Arrange
      frontend = new Frontend();
      (ProxyConfig.getBasePath as jest.Mock).mockReturnValue("/api");
      (ProxyConfig.getSocketNamespace as jest.Mock).mockReturnValue("/socket");

      // Act
      const config = frontend.getFrontEndConfig();

      // Assert
      expect(config).toBe(
        "window.config = { basePath: '/api', publicPath: '', wsNamespace: '/socket',};",
      );
    });

    it("should include API_PUBLIC_URL when set", () => {
      // Arrange
      process.env.API_PUBLIC_URL = "https://example.com";
      frontend = new Frontend();

      // Act
      const config = frontend.getFrontEndConfig();

      // Assert
      expect(config).toBe(
        "window.config = { basePath: '/api', publicPath: 'https://example.com', wsNamespace: '/socket',};",
      );
    });
  });

  describe("listPublicFiles", () => {
    it("should log files in the directory", () => {
      // Arrange
      frontend = new Frontend();
      const mockFiles = ["index.html", "main.js", "styles.css"];
      (fs.readdir as unknown as jest.Mock).mockImplementation(
        (path, callback) => {
          callback(null, mockFiles);
        },
      );
      const logger = loggerFactory.getLogger("API");

      // Act
      frontend.listPublicFiles("/test/path");

      // Assert
      expect(fs.readdir).toHaveBeenCalledWith(
        "/test/path",
        expect.any(Function),
      );
      expect(logger.debug).toHaveBeenCalledTimes(3);
      expect(logger.debug).toHaveBeenCalledWith("index.html");
      expect(logger.debug).toHaveBeenCalledWith("main.js");
      expect(logger.debug).toHaveBeenCalledWith("styles.css");
    });

    it("should handle errors when reading directory", () => {
      // Arrange
      frontend = new Frontend();
      const mockError = new Error("Failed to read directory");
      (fs.readdir as unknown as jest.Mock).mockImplementation(
        (path, callback) => {
          callback(mockError, null);
        },
      );
      const logger = loggerFactory.getLogger("API");

      // Act
      frontend.listPublicFiles("/test/path");

      // Assert
      expect(fs.readdir).toHaveBeenCalledWith(
        "/test/path",
        expect.any(Function),
      );
      expect(logger.info).toHaveBeenCalledWith(
        "Unable to scan directory: " + mockError,
      );
    });
  });

  describe("getPath", () => {
    it("should return the static path", () => {
      // Arrange
      frontend = new Frontend();
      frontend.pathStatic = "/test/static/path";

      // Act
      const result = frontend.getPath();

      // Assert
      expect(result).toBe("/test/static/path");
    });
  });
});
