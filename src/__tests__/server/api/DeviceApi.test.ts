import request from "supertest";
import express from "express";
import StateStore, { DeviceStore } from "../../../store/state";
import { DeviceState } from "../../../models/models";
import MockRfxcom from "../../../rfxcom/Mock";
import MockMqtt from "../../../mqtt";
import Discovery from "../../../discovery";
import DeviceApi from "../../../server/api/DeviceApi";
import DeviceService from "../../../services/DeviceService";
import { Action } from "../../../models/models";
import { settingsService } from "../../../settings";

describe("DeviceApi", () => {
  let app: express.Application;
  let deviceService: DeviceService;
  let actionCallback: jest.Mock;
  let mockDeviceStore: DeviceStore;
  let mockStateStore: StateStore;
  let mockDiscovery: Discovery;
  let mockMqtt: MockMqtt;
  let mockRfxcom: MockRfxcom;

  beforeEach(() => {
    const config = settingsService.read();
    mockDeviceStore = new DeviceStore();
    mockDeviceStore.load();
    mockStateStore = new StateStore();
    mockMqtt = new MockMqtt();
    mockRfxcom = new MockRfxcom();
    mockDiscovery = new Discovery(
      mockMqtt,
      mockRfxcom,
      mockStateStore,
      mockDeviceStore,
    );
    deviceService = new DeviceService(
      mockDeviceStore,
      mockStateStore,
      mockDiscovery,
    );
    actionCallback = jest.fn();
    app = express();
    app.use(express.json());
    const deviceApi = new DeviceApi(deviceService, actionCallback);
    app.use("/devices", deviceApi.router);
    mockRfxcom.subscribeProtocolsEvent((type: any, evt: any) => {});
    jest
      .spyOn(deviceService, "renameDeviceSwitch")
      .mockImplementation(() => {});
    jest.spyOn(deviceService, "renameDevice").mockImplementation(() => {});
  });

  it("should return all devices", async () => {
    const devices = { 0: new DeviceState("1", "Device 1") };
    jest.spyOn(deviceService, "getAllDevices").mockReturnValue(devices);

    const response = await request(app).get("/devices/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(devices);
  });

  it("should return a device by id", async () => {
    const device = new DeviceState("1", "Device 1");
    jest.spyOn(deviceService, "getDeviceById").mockReturnValue(device);

    const response = await request(app).get("/devices/1");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(device);
  });

  it("should rename a device", async () => {
    const newName = "New Device Name";
    const response = await request(app)
      .post("/devices/temp_device/rename")
      .send({ name: newName });
    expect(response.status).toBe(200);
    expect(deviceService.renameDevice).toHaveBeenCalledWith(
      "temp_device",
      newName,
    );
  });

  it("should return device state", async () => {
    const device = new DeviceState("temp_device", "Device temp_device");
    jest.spyOn(deviceService, "getDeviceById").mockReturnValue(device);

    const response = await request(app).get("/devices/1/state");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(device);
  });

  it("should handle device action", async () => {
    const action = "turn_on";
    const entityId = "light.1";
    const response = await request(app)
      .post("/devices/0x011Bmocked_device2/action")
      .send({ action, entityId });
    expect(response.status).toBe(200);
    expect(actionCallback).toHaveBeenCalledWith(
      new Action("device", action, "0x011Bmocked_device2", entityId),
    );
  });

  it("should rename a device switch", async () => {
    const newName = "New Switch Name";
    const unitCode = 1;
    const response = await request(app)
      .post("/devices/0x011Bmocked_device2/switch/1/rename")
      .send({ name: newName, unitCode: unitCode.toString() });
    expect(response.status).toBe(200);
    expect(deviceService.renameDeviceSwitch).toHaveBeenCalledWith(
      "0x011Bmocked_device2",
      "1",
      unitCode,
      newName,
    );
  });
});
