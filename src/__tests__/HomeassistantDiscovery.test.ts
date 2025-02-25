import HomeassistantDiscovery from "../discovery/HomeassistantDiscovery";
import { IMqtt } from "../mqtt";
import { IRfxcom } from "../rfxcom";
import StateStore, { DeviceStore } from "../store/state";
import { settingsService } from "../settings";
import { MQTTMessage } from "../models/mqtt";
import MockRfxcom from "../rfxcom/Mock";
import { DeviceState } from "../models/models";

describe("HomeassistantDiscovery", () => {
  let mqtt: IMqtt;
  let rfxtrx: IRfxcom;
  let state: StateStore;
  let deviceStore: DeviceStore;
  let discovery: HomeassistantDiscovery;

  beforeEach(() => {
    const config = settingsService.read();
    jest.clearAllMocks();
    mqtt = {
      publish: jest.fn(),
      topics: {
        devices: "devices",
      },
    } as any;
    rfxtrx = new MockRfxcom();
    deviceStore = new DeviceStore();
    deviceStore.load();
    rfxtrx.subscribeProtocolsEvent((type: any, evt: any) => {
      const json = JSON.stringify(evt, null, 2);
      const payload = JSON.parse(json);
      const deviceId =
        payload.subTypeValue + "_" + payload.id.replace("0x", "");
      const deviceState = new DeviceState(payload.id, deviceId);
      deviceState.subtype = payload.subtype;
      deviceState.subTypeValue = payload.subTypeValue;
      deviceState.type = payload.type;

      deviceStore.set(payload.id, deviceState);
    });
    state = new StateStore();

    discovery = new HomeassistantDiscovery(mqtt, rfxtrx, state, deviceStore);
  });

  it("should start and stop correctly", () => {
    jest.spyOn(state, "start");
    jest.spyOn(state, "stop");
    discovery.start();
    expect(state.start).toHaveBeenCalled();
    discovery.stop();
    expect(state.stop).toHaveBeenCalled();
  });

  it("should handle MQTT messages correctly", () => {
    const data: MQTTMessage = {
      topic: "rfxcom2mqtt/lighting2/0/0/0x1234/set",
      message: Buffer.from("on"),
    };
    const entityState = {
      entityId: "0x1234",
      type: "lighting2",
      rfxFunction: "",
      command: "",
      commandNumber: 0,
    };
    jest.spyOn(state, "getByDeviceIdAndUnitCode").mockReturnValue(entityState);
    jest.spyOn(state, "set");
    discovery.onMQTTMessage(data);
    expect(mqtt.publish).toHaveBeenCalledWith(
      "devices/0x1234",
      JSON.stringify(entityState),
      expect.any(Function),
      { retain: true, qos: 1 },
    );
    expect(state.set).toHaveBeenCalledWith("0x1234", entityState);
  });

  it("should update entity state correctly", () => {
    const entityState = {
      type: "lighting2",
      rfxFunction: "",
      command: "",
      commandNumber: 0,
    };
    discovery.updateEntityStateFromValue(entityState, "on");
    expect(entityState).toEqual({
      type: "lighting2",
      rfxFunction: "switchOn",
      command: "on",
      commandNumber: 1,
    });
  });

  it("should publish discovery to MQTT correctly", () => {
    const payload = {
      id: "0x1234",
      subTypeValue: "lighting2",
      type: "lighting2",
    };
    jest.spyOn(state, "set");
    jest.spyOn(deviceStore, "set");
    discovery.publishDiscoveryToMQTT(payload);
    expect(state.set).toHaveBeenCalled();
    expect(deviceStore.set).toHaveBeenCalled();
  });

  it("should publish discovery device to MQTT correctly", () => {
    const deviceJson = {
      getId: jest.fn().mockReturnValue("0x1234"),
      getInfo: jest.fn().mockReturnValue({}),
      getSensors: jest.fn().mockReturnValue([]),
      getBinarySensors: jest.fn().mockReturnValue([]),
      getCovers: jest.fn().mockReturnValue([]),
      getSelects: jest.fn().mockReturnValue([]),
      getSwitchs: jest.fn().mockReturnValue([]),
      getStateTopic: jest.fn().mockReturnValue("state/topic"),
      getCommandTopic: jest.fn().mockReturnValue("command/topic"),
      overrideDeviceInfo: jest.fn(),
      state: {
        name: "Device Name",
      },
    } as any;
    discovery.publishDiscoveryDeviceToMqtt(deviceJson, "bridge_name");
    expect(deviceJson.getInfo).toHaveBeenCalled();
  });

  it("should load discovery switch info correctly", () => {
    const payload = {
      id: "0x1234",
      type: "lighting2",
      unitCode: 1,
      group: false,
    };
    const deviceJson = {
      getEntityId: jest.fn().mockReturnValue("entityId"),
      state: {
        originalName: "Original Name",
      },
      addSwitch: jest.fn(),
    } as any;
    discovery.loadDiscoverySwitchInfo(payload, deviceJson);
    expect(deviceJson.addSwitch).toHaveBeenCalled();
  });

  it("should load discovery binary sensor info correctly", () => {
    const payload = {
      id: "0x1234",
      type: "security1",
    };
    const deviceJson = {
      getEntityId: jest.fn().mockReturnValue("entityId"),
      addBinarySensor: jest.fn(),
    } as any;
    discovery.loadDiscoveryBinarySensorInfo(payload, deviceJson);
    expect(deviceJson.addBinarySensor).toHaveBeenCalled();
  });

  it("should load discovery select info correctly", () => {
    const payload = {
      id: "0x1234",
      type: "todo",
    };
    const deviceJson = {
      getEntityId: jest.fn().mockReturnValue("entityId"),
      addSelect: jest.fn(),
    } as any;
    discovery.loadDiscoverySelectInfo(payload, deviceJson);
    expect(deviceJson.addSelect).toHaveBeenCalled();
  });

  it("should load discovery cover info correctly", () => {
    const payload = {
      id: "0x1234",
      type: "todo",
    };
    const deviceJson = {
      getEntityId: jest.fn().mockReturnValue("entityId"),
      addCover: jest.fn(),
    } as any;
    discovery.loadDiscoveryCoverInfo(payload, deviceJson);
    expect(deviceJson.addCover).toHaveBeenCalled();
  });

  it("should load discovery sensor info correctly", () => {
    const payload = {
      id: "0x1234",
      rssi: 100,
      batteryLevel: 80,
      batteryVoltage: 3.7,
      humidity: 55,
      temperature: 22,
      co2: 400,
      power: 50,
      energy: 10,
      barometer: 1013,
      count: 5,
      weight: 70,
      uv: 3,
    };
    const deviceJson = {
      getId: jest.fn().mockReturnValue("0x1234"),
      addSensor: jest.fn(),
    } as any;
    discovery.loadDiscoverySensorInfo(payload, deviceJson);
    expect(deviceJson.addSensor).toHaveBeenCalledTimes(12);
  });
});
