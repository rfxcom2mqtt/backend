export default interface IRfxcom {
  isGroup(payload: any): boolean;
  initialise(): Promise<void>;
  getStatus(callback: any): void;
  onStatus(callback: any): void;
  onCommand(
    deviceType: string,
    entityName: string,
    payload: any,
    deviceConf: any,
  ): void;
  onDisconnect(callback: any): void;
  subscribeProtocolsEvent(callback: any): void;
  getSubType(type: string, subType: string): string;
  stop(): void;
  sendCommand(
    deviceType: string,
    subTypeValue: string,
    command: string | undefined,
    entityName: string,
  ): void;
}
