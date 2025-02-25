import DeviceService from "../../services/DeviceService";
import StateStore, { DeviceStore } from "../../store/state";
import { DeviceState } from "../../models/models";
import Discovery from "../../discovery";
import MockRfxcom from "../../rfxcom/Mock";
import MockMqtt from "../../mqtt";
import { settingsService } from "../../settings";

describe("DeviceService", () => {
  let deviceService: DeviceService;
  let mockDeviceStore: DeviceStore;
  let mockStateStore: StateStore;
  let mockMqtt: MockMqtt;
  let mockRfxcom: MockRfxcom;
  let mockDiscovery: Discovery;

  beforeEach(() => {
    const config = settingsService.read();
    mockDeviceStore = new DeviceStore();
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
    mockDeviceStore.load();
    mockRfxcom.subscribeProtocolsEvent((type: any, evt: any) => {
      const json = JSON.stringify(evt, null, 2);
      const payload = JSON.parse(json);
      const deviceId =
        payload.subTypeValue + "_" + payload.id.replace("0x", "");
      const deviceState = new DeviceState(payload.id, deviceId);
      deviceState.subtype = payload.subtype;
      deviceState.subTypeValue = payload.subTypeValue;
      deviceState.type = payload.type;

      mockDeviceStore.set(payload.id, deviceState);
    });
  });

  it("should get all devices", () => {
    const devices = deviceService.getAllDevices();
    expect(devices).toBeDefined();
  });

  it("should get a device by id", () => {
    const deviceId = "temphum_device";
    const device = deviceService.getDeviceById(deviceId);
    expect(device).toBeDefined();
    expect(device.name).toBe("TH1_temphum_device");
  });

  //it("should rename a device", () => {
  //  const deviceId = "waterlevel_device";
  //  const newName = "New Device Name";
  //  deviceService.renameDevice(deviceId, newName);
  //  const renamedDevice = deviceService.getDeviceById(deviceId);
  //  expect(renamedDevice.name).toBe(newName);
  //});

  it("should rename a device switch", () => {
    const deviceId = "0x011Bmocked_device2";
    const newName = "New Device switch Name";
    deviceService.renameDeviceSwitch(deviceId, "1", 1, newName);
    const renamedDevice = deviceService.getDeviceById(deviceId);
    expect(renamedDevice.name).toBe("AC_011Bmocked_device2");
  });
});
