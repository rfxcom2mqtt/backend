import StateStore, { DeviceStore } from "../store/state";
import { DeviceStateStore } from "../models/models";
import { lookup } from "../discovery/Homeassistant";
import { settingsService } from "../settings";
import { loggerFactory } from "../utils/logger";
import Discovery from "../discovery";

const logger = loggerFactory.getLogger("DeviceService");

class DeviceService {
  constructor(
    private devicesStore: DeviceStore,
    private state: StateStore,
    private discovery: Discovery,
  ) {}

  getAllDevices() {
    const devices = this.devicesStore.getAll();
    for (const index in devices) {
      const device = new DeviceStateStore(devices[index]);
      device.overrideDeviceInfo();
    }
    return devices;
  }

  getDeviceById(id: string) {
    logger.info(`get device ${id} info`);
    const state = this.devicesStore.get(id);
    if (state === undefined) {
      const errorMessage = `device ${id} not found`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    const device = new DeviceStateStore(state);
    device.overrideDeviceInfo();
    for (const index in device.getSensors()) {
      const sensor = device.getSensors()[index];
      device.getSensors()[index] = {
        ...sensor,
        ...lookup[sensor.type],
      };
    }
    return device.state;
  }

  renameDevice(id: string, newName: string) {
    logger.info(`rename device ${id} to ${newName}`);
    settingsService.applyDeviceOverride({ id, name: newName });
    const state = this.devicesStore.get(id);
    if (state === undefined) {
      const errorMessage = `device ${id} not found`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    const device = new DeviceStateStore(state);
    device.overrideDeviceInfo();
    this.devicesStore.set(id, device.state);
    this.discovery.publishDiscoveryDeviceToMqtt(
      device,
      settingsService.get().homeassistant.discovery_device,
    );
  }

  renameDeviceSwitch(
    id: string,
    itemId: string,
    unitCode: number,
    newName: string,
  ) {
    logger.info(`rename device ${id} to ${newName}`);
    logger.info(
      "rename  device " + id + " sensor " + itemId + " to " + newName,
    );
    settingsService.applyDeviceOverride({
      id: id,
      units: [{ unitCode: unitCode, name: newName }],
    });

    const device = new DeviceStateStore(this.devicesStore.get(id));
    device.overrideDeviceInfo();
    this.devicesStore.set(id, device.state);
    this.discovery.publishDiscoveryDeviceToMqtt(
      device,
      settingsService.get().homeassistant.discovery_device,
    );
  }
}

export default DeviceService;
