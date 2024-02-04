//  subtype: string,
//seqnbr:           seqnbr,
//cmnd:             cmnd,

export class RfxcomInfo {
  receiverTypeCode: number = 0;
  receiverType: string = "";
  hardwareVersion: string = "";
  firmwareVersion: number = 0;
  firmwareType: string = "";
  enabledProtocols: string[] = [];
}

type RfxcomEvent = {
  id: string;
  subtype: string;
  seqnbr: string;
  houseCode: string;
  unitCode: string;
  commandNumber: string;
  command: string;
  rssi: string;
  level: string;
  data: string;
  pulseWidth: string;
  groupCode: string;
  state: string;
  co2: string;
  batteryLevel: string;
  colour: string;
  maxRepeat: string;
  repeatCount: string;
  batteryVoltage: string;
  extraBytes: string;
  alert: string;
  deviceStatus: string;
  commandTime: string;
  deviceTypeNumber: string;
  sceneNumber: string;
  channelNumber: string;
  tampered: string;
  percent: string;
  angle: string;
  setpoint: string;
  modeNumber: string;
  mode: string;
  statusNumber: string;
  rainfall: string;
  humidityStatus: string;
  forecast: string;
  temperature: string;
  humidity: string;
  barometer: string;
  rainfallIncrement: string;
  rainfallRate: string;
  gustSpeed: string;
  direction: string;
  averageSpeed: string;
  chillfactor: string;
  uv: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  weekDay: string;
  count: string;
  current: string;
  power: string;
  energy: string;
  powerFactor: string;
  frequency: string;
  weight: string;
  message: string;
  status: string;
  distance: string;
  strikes: string;
  valid: string;
  insolation: string;
};
