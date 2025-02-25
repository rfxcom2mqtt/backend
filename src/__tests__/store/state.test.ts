import StateStore, { DeviceStore } from "../../store/state";
import fs from "fs";
import { settingsService } from "../../settings";
import { EntityState, DeviceState } from "../../models/models";

jest.mock("fs");

describe("StateStore", () => {
  let stateStore: StateStore;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = settingsService.read();
    stateStore = new StateStore();
  });

  it("should start and stop correctly", () => {
    jest.spyOn(stateStore, "load");
    jest.spyOn(stateStore, "save" as any);
    stateStore.start();
    expect(stateStore.load).toHaveBeenCalled();
    stateStore.stop();
  });

  it("should load state from file", () => {
    const mockState = { entity1: { id: "entity1" } };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockState));
    stateStore.load();
    expect(stateStore.getAll()).toEqual(mockState);
  });

  it("should save state to file", () => {
    stateStore.set("entity1", { id: "entity1" });
    stateStore.start();
  });

  it("should reset state", () => {
    stateStore.set("entity1", { id: "entity1" });
    stateStore.reset();
    expect(stateStore.getAll()).toEqual({});
  });

  it("should check if entity exists", () => {
    stateStore.set("entity1", { id: "entity1" });
    expect(stateStore.exists({ id: "entity1" } as EntityState)).toBe(true);
    expect(stateStore.exists({ id: "entity2" } as EntityState)).toBe(false);
  });

  it("should get entity by id", () => {
    stateStore.set("entity1", { id: "entity1" });
    expect(stateStore.get("entity1")).toEqual({
      entityId: "entity1",
      id: "entity1",
    });
  });

  it("should get entity by device id and unit code", () => {
    stateStore.set("entity1", { id: "device1", unitCode: "1" });
    expect(stateStore.getByDeviceIdAndUnitCode("device1", 1)).toEqual({
      entityId: "entity1",
      id: "device1",
      unitCode: "1",
    });
  });

  it("should get all entities of a device", () => {
    stateStore.set("entity1", { id: "device1" });
    stateStore.set("entity2", { id: "device1" });
    expect(stateStore.getByDeviceId("device1")).toEqual([
      { id: "device1", entityId: "entity1" },
      { id: "device1", entityId: "entity2" },
    ]);
  });

  it("should get all entities", () => {
    stateStore.set("entity1", { id: "entity1" });
    expect(stateStore.getAll()).toEqual({
      entity1: { entityId: "entity1", id: "entity1" },
    });
  });

  it("should update entity state", () => {
    stateStore.set("entity1", { id: "entity1", state: "on" });
    stateStore.set("entity1", { state: "off" });
    expect(stateStore.get("entity1")).toEqual({
      id: "entity1",
      state: "off",
      entityId: "entity1",
    });
  });

  it("should remove entity state", () => {
    stateStore.set("entity1", { id: "entity1" });
    stateStore.remove("entity1");
    expect(stateStore.getAll()).toEqual({});
  });
});

describe("DeviceStore", () => {
  let deviceStore: DeviceStore;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = settingsService.read();
    deviceStore = new DeviceStore();
  });

  it("should start and stop correctly", () => {
    jest.spyOn(deviceStore, "load");
    jest.spyOn(deviceStore, "save" as any);
    deviceStore.start();
    expect(deviceStore.load).toHaveBeenCalled();
    deviceStore.stop();
  });

  it("should load devices from file", () => {
    const mockDevices = { device1: { id: "device1" } };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockDevices));
    deviceStore.load();
    expect(deviceStore.getAll()).toEqual(mockDevices);
  });

  it("should save devices to file", () => {
    const deviceState = new DeviceState("device1", "waterlevel_device");
    deviceState.subtype = 0;
    deviceState.subTypeValue = "2";
    deviceState.type = "waterlevel";
    deviceStore.set("device1", deviceState);
    deviceStore.start();
  });

  it("should reset devices", () => {
    const deviceState = new DeviceState("device1", "waterlevel_device");
    deviceState.subtype = 0;
    deviceState.subTypeValue = "2";
    deviceState.type = "waterlevel";
    deviceStore.set("device1", deviceState);
    deviceStore.reset();
    expect(deviceStore.getAll()).toEqual({});
  });

  it("should check if device exists", () => {
    const deviceState = new DeviceState("device1", "waterlevel_device");
    deviceState.subtype = 0;
    deviceState.subTypeValue = "2";
    deviceState.type = "waterlevel";
    deviceStore.set("device1", deviceState);
    expect(deviceStore.exists("device1")).toBe(true);
    expect(deviceStore.exists("device2")).toBe(false);
  });

  it("should get device by id", () => {
    const deviceState = new DeviceState("device1", "waterlevel_device");
    deviceState.subtype = 0;
    deviceState.subTypeValue = "2";
    deviceState.type = "waterlevel";
    deviceStore.set("device1", deviceState);
    expect(deviceStore.get("device1")).toEqual(deviceState);
  });

  it("should get all devices", () => {
    const deviceState = new DeviceState("device1", "waterlevel_device");
    deviceState.subtype = 0;
    deviceState.subTypeValue = "2";
    deviceState.type = "waterlevel";
    deviceStore.set("device1", deviceState);
    expect(deviceStore.getAll()).toMatchObject({ device1: deviceState });
  });

  it("should update device state", () => {
    const deviceState = new DeviceState("device1", "0x011Bmocked_device2");
    deviceState.subtype = 0;
    deviceState.subTypeValue = "AC";
    deviceState.type = "lighting2";

    deviceStore.set("device1", deviceState);
    deviceState.type = "lighting1";
    deviceStore.set("device1", deviceState);
    expect(deviceStore.get("device1")).toMatchObject({ type: "lighting1" });
  });

  it("should remove device state", () => {
    const deviceState = new DeviceState("device1", "0x011Bmocked_device2");
    deviceState.subtype = 0;
    deviceState.subTypeValue = "AC";
    deviceState.type = "lighting2";
    deviceStore.set("device1", deviceState);
    deviceStore.remove("device1");
    expect(deviceStore.getAll()).toEqual({});
  });
});
