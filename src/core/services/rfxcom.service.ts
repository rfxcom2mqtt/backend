import { RfxcomInfo } from "../models/rfxcom";

export interface OnStatusCallback {
  (coordinatorInfo: RfxcomInfo): void;
}

export interface StatusCallback {
  (status: string): void;
}

export interface RfxcomEventHandler {
  (type: any, evt: any): void;
}

export default interface IRfxcom {
  isGroup(payload: any): boolean;
  initialise(): Promise<void>;
  getStatus(callback: StatusCallback): void;
  onStatus(callback: OnStatusCallback): void;
  onCommand(
    deviceType: string,
    entityName: string,
    payload: any,
    deviceConf: any,
  ): void;
  onDisconnect(callback: any): void;
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
