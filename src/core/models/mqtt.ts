export interface MQTTMessage {
  topic: string;
  message: any;
}

export class Topic {
  base: string;
  will: string;
  devices: string;
  info: string;

  constructor(baseTopic: string) {
    this.base = baseTopic;
    this.devices = "devices";
    this.will = "bridge/status";
    this.info = "bridge/info";
  }
}
