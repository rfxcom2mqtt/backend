import load from "node-config-yaml";
import objectAssignDeep from "object-assign-deep";
import { KeyValue } from "../models/models";
import yaml from "./yaml";
import path from "path";
import { logger, loggerFactory } from "../utils/logger";

type RecursivePartial<T> = { [P in keyof T]?: RecursivePartial<T[P]> };

export interface Settings {
  loglevel: "warn" | "debug" | "info" | "error";
  cacheState: {
    enable: boolean;
    saveInterval: number;
  };
  healthcheck: {
    enabled: boolean;
    cron: string;
  };
  homeassistant: SettingHass;
  devices: SettingDevice[];
  mqtt: SettingMqtt;
  rfxcom: SettingRfxcom;
  frontend: SettingFrontend;
}

export interface SettingFrontend {
  enabled: boolean;
  authToken: string;
  host: string;
  port: number;
  sslCert: string;
  sslKey: string;
}

export interface SettingMqtt {
  base_topic: string;
  include_device_information: boolean;
  retain: boolean;
  qos: 0 | 1 | 2;
  version?: 3 | 4 | 5;
  username?: string;
  password?: string;
  port?: string;
  server: string;
  key?: string;
  ca?: string;
  cert?: string;
  keepalive?: number;
  client_id?: string;
  reject_unauthorized?: boolean;
}

export interface SettingHass {
  discovery: boolean;
  discovery_topic: string;
  discovery_device: string;
}

export interface SettingRfxcom {
  usbport: string;
  debug: boolean;
  transmit: {
    repeat: number;
    lighting1: string[];
    lighting2: string[];
    lighting3: string[];
    lighting4: string[];
  };
  receive: string[];
}

export interface SettingDevice {
  id: string;
  name?: string;
  type?: string;
  subtype?: string;
  units?: Units[];
  options?: string[];
  repetitions?: number;
}

export interface Units {
  unitCode: number;
  name: string;
}

function parseValueRef(text: string): { filename: string; key: string } | null {
  const match = /!(.*) (.*)/g.exec(text);
  if (match) {
    let filename = match[1];
    // This is mainly for backward compatibility.
    if (!filename.endsWith(".yaml") && !filename.endsWith(".yml")) {
      filename += ".yaml";
    }
    return { filename, key: match[2] };
  } else {
    return null;
  }
}

class SettingsService {
  private _settingsWithDefaults?: Settings;

  read(): Settings {
    if (!this._settingsWithDefaults) {
      this.loadSettingsWithDefaults(data.getConfigPath());
    }

    return this._settingsWithDefaults!!;
  }

  get(): Settings {
    return this._settingsWithDefaults!!;
  }

  readLocalFile(file: string): Settings {
    return load.load(file) as Settings;
  }

  getFileSettings(file: string): Partial<Settings> {
    return this.readLocalFile(file);
  }

  loadSettingsWithDefaults(file: string): void {
    this._settingsWithDefaults = objectAssignDeep(
      {},
      defaults,
      this.getFileSettings(file),
    ) as Settings;
    applyEnvironmentVariables(this._settingsWithDefaults);
    applySecretVariables(this._settingsWithDefaults);

    loggerFactory.setLevel(this._settingsWithDefaults!!.loglevel);
    logger.info("configuration loaded from path : " + file);
  }

  set(path: string[], value: string | number | boolean | KeyValue): void {
    /* eslint-disable-next-line */
    let settings: any = this._settingsWithDefaults;

    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (i === path.length - 1) {
        settings[key] = value;
      } else {
        if (!settings[key]) {
          settings[key] = {};
        }

        settings = settings[key];
      }
    }

    this.write();
  }

  getDeviceConfig(deviceId: string): SettingDevice | undefined {
    if (this._settingsWithDefaults!!.devices === undefined) {
      return;
    }

    return this._settingsWithDefaults!!.devices.find(
      (dev: SettingDevice) => dev.id === deviceId,
    );
  }

  apply(newSettings: Record<string, unknown>) {
    //TODO add settings validation

    const _settings = this._settingsWithDefaults;
    /* eslint-disable-line */ // @ts-ignore
    this._settingsWithDefaults = objectAssignDeep.noMutate(
      _settings,
      newSettings,
    );

    this.write();
  }

  applyDeviceOverride(newSettings: SettingDevice) {
    //TODO add settings validation
    let found = false;
    let devices: SettingDevice[] = [];
    if (this._settingsWithDefaults?.devices != undefined) {
      devices = this._settingsWithDefaults?.devices;
      logger.info("config device " + devices.length);
      for (const index in devices) {
        const device: SettingDevice = devices[index];
        logger.info("override device " + newSettings.id);
        if (device.id === newSettings.id) {
          found = true;
          if (newSettings.name !== undefined) {
            device.name = newSettings.name;
          }
          if (newSettings.units !== undefined) {
            let foundUnit = false;
            for (const indexU in device.units) {
              const unit: Units = device.units[indexU];
              logger.info(
                "search unit code " +
                  newSettings.units[0].unitCode +
                  "==" +
                  unit.unitCode,
              );
              if (unit.unitCode === newSettings.units[0].unitCode) {
                foundUnit = true;
                if (newSettings.units[0].name !== undefined) {
                  unit.name = newSettings.units[0].name;
                }
              }
            }
            if (!foundUnit) {
              logger.info("push unit code " + newSettings.units[0].unitCode);
              device.units?.push(newSettings.units[0]);
            }
          }
        }
      }
    }

    if (!found) {
      devices?.push(newSettings);
    }

    this._settingsWithDefaults!!.devices = devices;

    this.write();
  }

  write(): void {
    const settings = this._settingsWithDefaults;
    const toWrite: KeyValue = objectAssignDeep({}, settings);

    // Read settings to check if we have to split devices/groups into separate file.
    const actual = yaml.read(data.getConfigPath());

    // In case the setting is defined in a separate file (e.g. !secret network_key) update it there.
    for (const path of [
      ["mqtt", "server"],
      ["mqtt", "user"],
      ["mqtt", "password"],
      ["frontend", "auth_token"],
    ]) {
      if (actual[path[0]] && actual[path[0]][path[1]]) {
        const ref = this.parseValueRef(actual[path[0]][path[1]]);
        if (ref) {
          yaml.updateIfChanged(
            data.joinPath(ref.filename),
            ref.key,
            toWrite[path[0]][path[1]],
          );
          toWrite[path[0]][path[1]] = actual[path[0]][path[1]];
        }
      }
    }

    if (yaml.writeIfChanged(data.getConfigPath(), toWrite)) {
      this.loadSettingsWithDefaults(data.getConfigPath());
    }
  }

  parseValueRef(text: string): { filename: string; key: string } | null {
    const match = /!(.*) (.*)/g.exec(text);
    if (match) {
      let filename = match[1];
      // This is mainly for backward compatibility.
      if (!filename.endsWith(".yaml") && !filename.endsWith(".yml")) {
        filename += ".yaml";
      }
      return { filename, key: match[2] };
    } else {
      return null;
    }
  }

  validate(): string[] {
    const errors: string[] = [];
    //errors.push("test");
    return errors;
  }
}

export const settingsService = new SettingsService();

const defaults: RecursivePartial<Settings> = {
  loglevel: "info",
  healthcheck: {
    enabled: true,
    cron: "* * * * *",
  },
  cacheState: {
    enable: true,
    saveInterval: 1, // interval in minutes
  },
  homeassistant: {
    discovery: true,
    discovery_topic: "homeassistant",
    discovery_device: "rfxcom2mqtt",
  },
  devices: [],
  mqtt: {
    base_topic: "rfxcom2mqtt",
    include_device_information: false,
    qos: 0,
    retain: true,
  },
  rfxcom: {
    debug: true,
    receive: [
      "temperaturehumidity1",
      "homeconfort",
      "lighting1",
      "lighting2",
      "lighting3",
      "lighting4",
      "remote",
      "security1",
    ],
  },
  frontend: {
    enabled: false,
  },
};

class DataPath {
  private dataPath: string;

  constructor() {
    this.dataPath = process.env.RFXCOM2MQTT_DATA ?? "/app/data/";
  }

  joinPath(file: string): string {
    return path.resolve(this.dataPath, file);
  }

  getPath(): string {
    return this.dataPath;
  }

  getConfigPath(): string {
    return this.dataPath + "config.yml";
  }
}
const data = new DataPath();

function applySecretVariables(settings: Partial<Settings>): void {
  // Read !secret MQTT username and password if set
  // eslint-disable-next-line
  const interpretValue = (value: any): any => {
    const ref = parseValueRef(value);
    if (ref) {
      return yaml.read(data.joinPath(ref.filename))[ref.key];
    } else {
      return value;
    }
  };

  if (settings.mqtt?.username) {
    settings.mqtt.username = interpretValue(settings.mqtt.username);
  }

  if (settings.mqtt?.password) {
    settings.mqtt.password = interpretValue(settings.mqtt.password);
  }

  if (settings.mqtt?.server) {
    settings.mqtt.server = interpretValue(settings.mqtt.server);
  }

  if (settings.frontend?.authToken) {
    settings.frontend.authToken = interpretValue(settings.frontend.authToken);
  }
}

function applyEnvironmentVariables(settings: Partial<Settings>): void {
  const mqttEnvVars = [
    { env: "MQTT_SERVER", props: "server" },
    { env: "MQTT_USERNAME", props: "username" },
    { env: "MQTT_PASSWORD", props: "password" },
    { env: "MQTT_CLIENT_ID", props: "client_id" },
  ];

  mqttEnvVars.forEach((envEntry) => {
    if (process.env[envEntry.env]) {
      if (settings.mqtt !== undefined) {
        // @ts-ignore
        settings.mqtt[envEntry.props] = process.env[envEntry.env];
      }
    }
  });

  const rfxcomEnvVars = [{ env: "RFXCOM_USB_DEVICE", props: "usbport" }];

  rfxcomEnvVars.forEach((envEntry) => {
    if (process.env[envEntry.env]) {
      // @ts-ignore
      settings.rfxcom[envEntry.props] = process.env[envEntry.env];
    }
  });

  const frontnvVars = [{ env: "FRONTEND_ENABLED", props: "enabled" },
                       { env: "FRONTEND_AUTH_TOKEN", props: "authToken" },
                       { env: "FRONTEND_PORT", props: "port" },
                       { env: "FRONTEND_HOST", props: "host" }];

  frontnvVars.forEach((envEntry) => {
    if (process.env[envEntry.env]) {
      // @ts-ignore
      settings.frontend[envEntry.props] = process.env[envEntry.env];
    }
  });
}

export function reRead(): void {
  settingsService.get();
}

export function validate(): string[] {
  return settingsService.validate();
}
