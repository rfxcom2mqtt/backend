import { Settings } from "../settings";
import { EntityState, DeviceState, KeyValue } from "../models/models";
import fs from "fs";
import objectAssignDeep from "object-assign-deep";
import { logger } from "../utils/logger";

const saveInterval = 1000 * 60 * 1; // 1 minutes

class StateStore {
  private state: { [s: string | number]: KeyValue } = {};
  private file = (process.env.RFXCOM2MQTT_DATA ?? "/app/data/") + "state.json";
  private timer?: NodeJS.Timeout = undefined;
  private config: Settings;
  private saveInterval: number;

  constructor(config: Settings) {
    this.config = config;
    this.saveInterval = 1000 * 60 * this.config.cacheState.saveInterval;
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
    if (this.config.cacheState.enable) {
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

  exists(entity: EntityState): boolean {
    return this.state.hasOwnProperty(entity.id);
  }

  get(entity: EntityState): KeyValue {
    logger.debug(`get entity state : ` + entity.id);
    return this.state[entity.id] || {};
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
  private config: Settings;
  private saveInterval: number;

  constructor(config: Settings) {
    this.config = config;
    this.saveInterval = 1000 * 60 * this.config.cacheState.saveInterval;
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

  private save(): void {
    if (this.config.cacheState.enable) {
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
    const fromState = this.devices[id] || new DeviceState([], "");
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
