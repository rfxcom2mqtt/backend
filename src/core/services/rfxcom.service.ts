import { SettingDevice } from "src/config/settings";
import { RfxcomEvent, RfxcomInfo } from "../models/rfxcom";

export interface OnStatusCallback {
  (coordinatorInfo: RfxcomInfo): void;
}

export interface StatusCallback {
  (status: string): void;
}

export interface RfxcomEventHandler {
  (type: string, evt: RfxcomEvent): void;
}

export interface CommandPayload {
  subtype?: string;
  deviceFunction?: string;
  value?: string | number;
  deviceOptions?: string[];
  command?: string;
  blindsMode?: string;
}

export default interface IRfxcom {
  isGroup(payload: RfxcomEvent): boolean;
  initialise(): Promise<void>;
  getStatus(callback: StatusCallback): void;
  onStatus(callback: OnStatusCallback): void;
  onCommand(
    deviceType: string,
    entityName: string,
    payload: CommandPayload | string,
    deviceConf?: SettingDevice,
  ): void;
  onDisconnect(callback: (evt: Record<string, unknown>) => void): void;
  subscribeProtocolsEvent(callback: RfxcomEventHandler): void;
  getSubType(type: string, subType: string): string;
  stop(): void;
  sendCommand(
    deviceType: string,
    subTypeValue: string,
    command: string | undefined,
    entityName: string,
  ): void;
}
