import { Settings } from "../settings";
import { EntityState, DeviceState, KeyValue } from "../models/models";
import fs from "fs";
import objectAssignDeep from "object-assign-deep";
import { settingsService } from "../settings";

import { loggerFactory } from "../utils/logger";
const logger = loggerFactory.getLogger("STORE");

const saveInterval = 1000 * 60; // 1 minutes

class StateStore {
  private state: { [s: string]: KeyValue } = {};
  private file = (process.env.RFXCOM2MQTT_DATA ?? "/app/data/") + "state.json";
  private timer?: NodeJS.Timeout = undefined;
  private saveInterval: number;

  constructor() {
    this.saveInterval =
      saveInterval * settingsService.get().cacheState.saveInterval;
  }

  start(): void {
    this.load();

    // Save the state on every interval
    this.timer = setInterval(() => this.save(), this.saveInterval);
  }

  stop(): void {
    clearTimeout(this.timer);
    this.save();
  }

  load(): void {
    if (fs.existsSync(this.file)) {
      try {
        this.state = JSON.parse(fs.readFileSync(this.file, "utf8"));
        logger.debug(`Loaded state from file ${this.file}`);
      } catch (e) {
        logger.debug(
          `Failed to load state from file ${this.file} (corrupt file?)`,
        );
      }
    } else {
      logger.debug(`Can't load state from file ${this.file} (doesn't exist)`);
    }
  }

  private save(): void {
    if (settingsService.get().cacheState.enable) {
      logger.debug(`Saving state to file ${this.file}`);
      const json = JSON.stringify(this.state, null, 4);
      try {
        fs.writeFileSync(this.file, json, "utf8");
      } catch (e: any) {
        logger.error(`Failed to write state to '${this.file}' (${e.message})`);
      }
    } else {
      logger.debug(`Not saving state`);
    }
  }

  reset(): void {
    try {
      this.state = {};
      fs.writeFileSync(this.file, "{}", "utf8");
    } catch (e: any) {
      logger.error(`Failed to write devices to '${this.file}' (${e.message})`);
    }
  }

  exists(entity: EntityState): boolean {
    return this.state.hasOwnProperty(entity.id);
  }

  get(id: string): KeyValue {
    logger.debug(`get entity state : ` + id);
    return this.state[id] || {};
  }

  getByDeviceIdAndUnitCode(id: string, unitCode?: number): KeyValue {
    logger.debug(`get entities of device : ` + id + "." + unitCode);

    for (const entity in this.state) {
      if (
        this.state[entity].id === id &&
        this.state[entity].unitCode === "" + unitCode
      ) {
        return this.state[entity];
      }
    }
    return {};
  }

  getByDeviceId(id: string): KeyValue {
    logger.debug(`get entities of device : ` + id);
    const entities: KeyValue[] = [];

    for (const entity in this.state) {
      if (this.state[entity].id === id) {
        const value = this.state[entity];
        entities.push(value);
      }
    }

    return entities;
  }

  getAll(): { [s: string | number]: KeyValue } {
    return this.state;
  }

  getAllValue(): KeyValue[] {
    const entities: KeyValue[] = [];
    for (const entity in this.state) {
      entities.push(this.state[entity]);
    }
    return entities;
  }

  set(id: string, update: KeyValue, reason?: string): KeyValue {
    logger.debug(`update entity state : ` + id);
    const fromState = this.state[id] || {};
    const toState = objectAssignDeep({}, fromState, update);
    toState.entityId = id;
    const newCache = { ...toState };
    this.state[id] = newCache;
    return toState;
  }

  remove(id: string): void {
    logger.debug(`remove entity state : ` + id);
    delete this.state[id];
  }
}

export class DeviceStore {
  private devices: { [s: string | number]: DeviceState } = {};
  private file =
    (process.env.RFXCOM2MQTT_DATA ?? "/app/data/") + "devices.json";
  private timer?: NodeJS.Timeout = undefined;
  private saveInterval: number;

  constructor() {
    this.saveInterval =
      saveInterval * settingsService.get().cacheState.saveInterval;
  }

  start(): void {
    this.load();

    // Save the state on every interval
    this.timer = setInterval(() => this.save(), this.saveInterval);
  }

  stop(): void {
    clearTimeout(this.timer);
    this.save();
  }

  load(): void {
    if (fs.existsSync(this.file)) {
      try {
        this.devices = JSON.parse(fs.readFileSync(this.file, "utf8"));
        logger.debug(`Loaded devices from file ${this.file}`);
      } catch (e) {
        logger.debug(
          `Failed to load devices from file ${this.file} (corrupt file?)`,
        );
      }
    } else {
      logger.debug(`Can't load devices from file ${this.file} (doesn't exist)`);
    }
  }

  reset(): void {
    try {
      this.devices = {};
      fs.writeFileSync(this.file, "{}", "utf8");
    } catch (e: any) {
      logger.error(`Failed to write devices to '${this.file}' (${e.message})`);
    }
  }

  private save(): void {
    if (settingsService.get().cacheState.enable) {
      logger.debug(`Saving devices to file ${this.file}`);
      const json = JSON.stringify(this.devices, null, 4);
      try {
        fs.writeFileSync(this.file, json, "utf8");
      } catch (e: any) {
        logger.error(
          `Failed to write devices to '${this.file}' (${e.message})`,
        );
      }
    } else {
      logger.debug(`Not saving devices`);
    }
  }

  exists(id: string): boolean {
    return this.devices.hasOwnProperty(id);
  }

  get(id: string): DeviceState {
    logger.debug(`get device state : ` + id);
    return this.devices[id];
  }

  getAll(): { [s: string | number]: DeviceState } {
    return this.devices;
  }

  set(id: string, update: DeviceState, reason?: string): DeviceState {
    logger.debug(`update device state : ` + id);
    const fromState = this.devices[id] || new DeviceState(id, "");
    const toState = objectAssignDeep({}, fromState, update);
    const newCache = { ...toState } as DeviceState;
    this.devices[id] = newCache;
    return this.devices[id];
  }

  remove(id: string | number): void {
    logger.debug(`remove device state : ` + id);
    delete this.devices[id];
  }
}

export default StateStore;
