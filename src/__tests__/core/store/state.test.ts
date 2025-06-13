import fs from "fs";
import { settingsService } from "../../../config/settings";
import { DeviceState, EntityState } from "../../../core/models";
import StateStore, { DeviceStore } from "../../../core/store/state";

// Mock dependencies
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock("../../../config/settings", () => ({
  settingsService: {
    get: jest.fn(),
  },
}));

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

describe("StateStore", () => {
  let stateStore: StateStore;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.RFXCOM2MQTT_DATA = "/test/data/";

    (settingsService.get as jest.Mock).mockReturnValue({
      cacheState: {
        enable: true,
        saveInterval: 2,
      },
    });

    stateStore = new StateStore();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should set saveInterval based on settings", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {
          saveInterval: 5,
        },
      });

      // Act
      const store = new StateStore();

      // Assert
      expect((store as any).saveInterval).toBe(1000 * 60 * 5);
    });

    it("should use default saveInterval if not specified in settings", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {},
      });

      // Act
      const store = new StateStore();

      // Assert
      expect((store as any).saveInterval).toBe(1000 * 60);
    });
  });

  describe("start", () => {
    it("should load state and set up save interval", () => {
      // Arrange
      jest.useFakeTimers();
      const loadSpy = jest.spyOn(stateStore, "load");
      const saveSpy = jest.spyOn(stateStore as any, "save");

      // Act
      stateStore.start();
      jest.advanceTimersByTime(1000 * 60 * 2); // Advance by 2 minutes

      // Assert
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("stop", () => {
    it("should clear timer and save state", () => {
      // Arrange
      jest.useFakeTimers();
      const saveSpy = jest.spyOn(stateStore as any, "save");
      stateStore.start();

      // Act
      stateStore.stop();

      // Assert
      expect(saveSpy).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1000 * 60 * 10); // Advance by 10 minutes
      expect(saveSpy).toHaveBeenCalledTimes(1); // Should still be 1 as timer was cleared
    });
  });

  describe("load", () => {
    it("should load state from file if it exists", () => {
      // Arrange
      const mockState = { entity1: { id: "entity1", value: "test" } };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockState));

      // Act
      stateStore.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith("/test/data/state.json");
      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/test/data/state.json",
        "utf8",
      );
      expect((stateStore as any).state).toEqual(mockState);
    });

    it("should handle file not existing", () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act
      stateStore.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith("/test/data/state.json");
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect((stateStore as any).state).toEqual({});
    });

    it("should handle JSON parse error", () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue("invalid json");

      // Act
      stateStore.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith("/test/data/state.json");
      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/test/data/state.json",
        "utf8",
      );
      expect((stateStore as any).state).toEqual({});
    });
  });

  describe("save", () => {
    it("should save state to file if cacheState is enabled", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {
          enable: true,
        },
      });
      (stateStore as any).state = { entity1: { id: "entity1", value: "test" } };

      // Act
      (stateStore as any).save();

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/test/data/state.json",
        JSON.stringify({ entity1: { id: "entity1", value: "test" } }, null, 4),
        "utf8",
      );
    });

    it("should not save state if cacheState is disabled", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {
          enable: false,
        },
      });

      // Act
      (stateStore as any).save();

      // Assert
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should handle write errors", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {
          enable: true,
        },
      });
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Write error");
      });

      // Act & Assert
      expect(() => (stateStore as any).save()).not.toThrow();
    });
  });

  describe("reset", () => {
    it("should reset state and write empty object to file", () => {
      // Arrange
      (stateStore as any).state = { entity1: { id: "entity1", value: "test" } };

      // Act
      stateStore.reset();

      // Assert
      expect((stateStore as any).state).toEqual({});
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/test/data/state.json",
        "{}",
        "utf8",
      );
    });

    it("should handle write errors", () => {
      // Arrange
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Write error");
      });

      // Act & Assert
      expect(() => stateStore.reset()).not.toThrow();
    });
  });

  describe("exists", () => {
    it("should return true if entity exists", () => {
      // Arrange
      (stateStore as any).state = { entity1: { id: "entity1", value: "test" } };
      const entity = { id: "entity1" } as EntityState;

      // Act
      const result = stateStore.exists(entity);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false if entity does not exist", () => {
      // Arrange
      (stateStore as any).state = { entity1: { id: "entity1", value: "test" } };
      const entity = { id: "entity2" } as EntityState;

      // Act
      const result = stateStore.exists(entity);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("get", () => {
    it("should return entity state if it exists", () => {
      // Arrange
      const entityState = { id: "entity1", value: "test" };
      (stateStore as any).state = { entity1: entityState };

      // Act
      const result = stateStore.get("entity1");

      // Assert
      expect(result).toEqual(entityState);
    });

    it("should return empty object if entity does not exist", () => {
      // Arrange
      (stateStore as any).state = { entity1: { id: "entity1", value: "test" } };

      // Act
      const result = stateStore.get("entity2");

      // Assert
      expect(result).toEqual({});
    });
  });

  describe("getByDeviceIdAndUnitCode", () => {
    it("should return entity state if it matches device ID and unit code", () => {
      // Arrange
      const entityState = { id: "device1", unitCode: "1", value: "test" };
      (stateStore as any).state = { entity1: entityState };

      // Act
      const result = stateStore.getByDeviceIdAndUnitCode("device1", 1);

      // Assert
      expect(result).toEqual(entityState);
    });

    it("should return empty object if no entity matches", () => {
      // Arrange
      (stateStore as any).state = {
        entity1: { id: "device1", unitCode: "2", value: "test" },
      };

      // Act
      const result = stateStore.getByDeviceIdAndUnitCode("device1", 1);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe("getByDeviceId", () => {
    it("should return all entities that match device ID", () => {
      // Arrange
      const entity1 = { id: "device1", unitCode: "1", value: "test1" };
      const entity2 = { id: "device1", unitCode: "2", value: "test2" };
      const entity3 = { id: "device2", unitCode: "1", value: "test3" };
      (stateStore as any).state = {
        entity1,
        entity2,
        entity3,
      };

      // Act
      const result = stateStore.getByDeviceId("device1");

      // Assert
      expect(result).toEqual([entity1, entity2]);
    });

    it("should return empty array if no entities match", () => {
      // Arrange
      (stateStore as any).state = {
        entity1: { id: "device1", unitCode: "1", value: "test1" },
      };

      // Act
      const result = stateStore.getByDeviceId("device2");

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getAll", () => {
    it("should return all state", () => {
      // Arrange
      const state = {
        entity1: { id: "entity1", value: "test1" },
        entity2: { id: "entity2", value: "test2" },
      };
      (stateStore as any).state = state;

      // Act
      const result = stateStore.getAll();

      // Assert
      expect(result).toEqual(state);
    });
  });

  describe("getAllValue", () => {
    it("should return all state values as array", () => {
      // Arrange
      const entity1 = { id: "entity1", value: "test1" };
      const entity2 = { id: "entity2", value: "test2" };
      (stateStore as any).state = {
        entity1,
        entity2,
      };

      // Act
      const result = stateStore.getAllValue();

      // Assert
      expect(result).toEqual([entity1, entity2]);
    });
  });

  describe("set", () => {
    it("should update existing entity state", () => {
      // Arrange
      const existingState = {
        id: "entity1",
        value: "test1",
        entityId: "entity1",
      };
      const update = { value: "updated" };
      (stateStore as any).state = { entity1: existingState };

      // Act
      const result = stateStore.set("entity1", update);

      // Assert
      expect(result).toEqual({
        id: "entity1",
        value: "updated",
        entityId: "entity1",
      });
      expect((stateStore as any).state.entity1).toEqual({
        id: "entity1",
        value: "updated",
        entityId: "entity1",
      });
    });

    it("should create new entity state if it does not exist", () => {
      // Arrange
      const update = { value: "new" };
      (stateStore as any).state = {};

      // Act
      const result = stateStore.set("entity1", update);

      // Assert
      expect(result).toEqual({ value: "new", entityId: "entity1" });
      expect((stateStore as any).state.entity1).toEqual({
        value: "new",
        entityId: "entity1",
      });
    });
  });

  describe("remove", () => {
    it("should remove entity state", () => {
      // Arrange
      (stateStore as any).state = {
        entity1: { id: "entity1", value: "test1" },
        entity2: { id: "entity2", value: "test2" },
      };

      // Act
      stateStore.remove("entity1");

      // Assert
      expect((stateStore as any).state).toEqual({
        entity2: { id: "entity2", value: "test2" },
      });
    });
  });
});

describe("DeviceStore", () => {
  let deviceStore: DeviceStore;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.RFXCOM2MQTT_DATA = "/test/data/";

    (settingsService.get as jest.Mock).mockReturnValue({
      cacheState: {
        enable: true,
        saveInterval: 2,
      },
    });

    deviceStore = new DeviceStore();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should set saveInterval based on settings", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {
          saveInterval: 5,
        },
      });

      // Act
      const store = new DeviceStore();

      // Assert
      expect((store as any).saveInterval).toBe(1000 * 60 * 5);
    });

    it("should use default saveInterval if not specified in settings", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {},
      });

      // Act
      const store = new DeviceStore();

      // Assert
      expect((store as any).saveInterval).toBe(1000 * 60);
    });
  });

  describe("start", () => {
    it("should load devices and set up save interval", () => {
      // Arrange
      jest.useFakeTimers();
      const loadSpy = jest.spyOn(deviceStore, "load");
      const saveSpy = jest.spyOn(deviceStore as any, "save");

      // Act
      deviceStore.start();
      jest.advanceTimersByTime(1000 * 60 * 2); // Advance by 2 minutes

      // Assert
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("stop", () => {
    it("should clear timer and save devices", () => {
      // Arrange
      jest.useFakeTimers();
      const saveSpy = jest.spyOn(deviceStore as any, "save");
      deviceStore.start();

      // Act
      deviceStore.stop();

      // Assert
      expect(saveSpy).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1000 * 60 * 10); // Advance by 10 minutes
      expect(saveSpy).toHaveBeenCalledTimes(1); // Should still be 1 as timer was cleared
    });
  });

  describe("load", () => {
    it("should load devices from file if it exists", () => {
      // Arrange
      const mockDevices = { device1: { id: "device1", name: "Device 1" } };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockDevices),
      );

      // Act
      deviceStore.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith("/test/data/devices.json");
      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/test/data/devices.json",
        "utf8",
      );
      expect((deviceStore as any).devices).toEqual(mockDevices);
    });

    it("should handle file not existing", () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act
      deviceStore.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith("/test/data/devices.json");
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect((deviceStore as any).devices).toEqual({});
    });

    it("should handle JSON parse error", () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue("invalid json");

      // Act
      deviceStore.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith("/test/data/devices.json");
      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/test/data/devices.json",
        "utf8",
      );
      expect((deviceStore as any).devices).toEqual({});
    });
  });

  describe("save", () => {
    it("should save devices to file if cacheState is enabled", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {
          enable: true,
        },
      });
      (deviceStore as any).devices = {
        device1: { id: "device1", name: "Device 1" },
      };

      // Act
      (deviceStore as any).save();

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/test/data/devices.json",
        JSON.stringify(
          { device1: { id: "device1", name: "Device 1" } },
          null,
          4,
        ),
        "utf8",
      );
    });

    it("should not save devices if cacheState is disabled", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {
          enable: false,
        },
      });

      // Act
      (deviceStore as any).save();

      // Assert
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should handle write errors", () => {
      // Arrange
      (settingsService.get as jest.Mock).mockReturnValue({
        cacheState: {
          enable: true,
        },
      });
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Write error");
      });

      // Act & Assert
      expect(() => (deviceStore as any).save()).not.toThrow();
    });
  });

  describe("reset", () => {
    it("should reset devices and write empty object to file", () => {
      // Arrange
      (deviceStore as any).devices = {
        device1: { id: "device1", name: "Device 1" },
      };

      // Act
      deviceStore.reset();

      // Assert
      expect((deviceStore as any).devices).toEqual({});
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/test/data/devices.json",
        "{}",
        "utf8",
      );
    });

    it("should handle write errors", () => {
      // Arrange
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Write error");
      });

      // Act & Assert
      expect(() => deviceStore.reset()).not.toThrow();
    });
  });

  describe("exists", () => {
    it("should return true if device exists", () => {
      // Arrange
      (deviceStore as any).devices = {
        device1: { id: "device1", name: "Device 1" },
      };

      // Act
      const result = deviceStore.exists("device1");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false if device does not exist", () => {
      // Arrange
      (deviceStore as any).devices = {
        device1: { id: "device1", name: "Device 1" },
      };

      // Act
      const result = deviceStore.exists("device2");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("get", () => {
    it("should return device if it exists", () => {
      // Arrange
      const device = { id: "device1", name: "Device 1" } as DeviceState;
      (deviceStore as any).devices = { device1: device };

      // Act
      const result = deviceStore.get("device1");

      // Assert
      expect(result).toEqual(device);
    });
  });

  describe("getAll", () => {
    it("should return all devices", () => {
      // Arrange
      const devices = {
        device1: { id: "device1", name: "Device 1" },
        device2: { id: "device2", name: "Device 2" },
      };
      (deviceStore as any).devices = devices;

      // Act
      const result = deviceStore.getAll();

      // Assert
      expect(result).toEqual(devices);
    });
  });

  describe("set", () => {
    it("should update existing device", () => {
      // Arrange
      const existingDevice = new DeviceState("device1", "Device 1");
      const update = { name: "Updated Device" } as DeviceState;
      (deviceStore as any).devices = { device1: existingDevice };

      // Act
      const result = deviceStore.set("device1", update);

      // Assert
      expect(result.name).toBe("Updated Device");
      expect((deviceStore as any).devices.device1.name).toBe("Updated Device");
    });

    it("should create new device if it does not exist", () => {
      // Arrange
      const update = { name: "New Device" } as DeviceState;
      (deviceStore as any).devices = {};

      // Act
      const result = deviceStore.set("device1", update);

      // Assert
      expect(result.id).toBe("device1");
      expect(result.name).toBe("New Device");
      expect((deviceStore as any).devices.device1).toBe(result);
    });
  });

  describe("remove", () => {
    it("should remove device", () => {
      // Arrange
      (deviceStore as any).devices = {
        device1: { id: "device1", name: "Device 1" },
        device2: { id: "device2", name: "Device 2" },
      };

      // Act
      deviceStore.remove("device1");

      // Assert
      expect((deviceStore as any).devices).toEqual({
        device2: { id: "device2", name: "Device 2" },
      });
    });
  });
});
