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

interface RfxcomEvent {
  id: string;
  subtype: string;
  seqnbr: string;
}

interface Lighting1Event extends RfxcomEvent {
  houseCode: string;
  unitCode: string;
  commandNumber: string;
  command: string;
  rssi: string;
}

interface Lighting2Event extends RfxcomEvent {
  unitCode: string;
  commandNumber: string;
  command: string;
  level: string;
  rssi: string;
}

interface Lighting4Event extends RfxcomEvent {
  data: string;
  commandNumber: string;
  command: string;
  pulseWidth: string;
  rssi: string;
}

interface Lighting5Event extends RfxcomEvent {
  unitCode: string;
  commandNumber: string;
  command: string;
  level: string;
  rssi: string;
}

interface Lighting6Event extends RfxcomEvent {
  groupCode: string;
  unitCode: string;
  commandNumber: string;
  command: string;
  rssi: string;
}

interface ChimeEvent extends RfxcomEvent {}
interface FanEvent extends RfxcomEvent {}
interface Blinds1Event extends RfxcomEvent {}
interface EdisioEvent extends RfxcomEvent {}
interface ActivLinkEvent extends RfxcomEvent {}
interface FunkbusEvent extends RfxcomEvent {}
interface HunterfanEvent extends RfxcomEvent {}
interface Security1Event extends RfxcomEvent {}

interface Camera1Event extends RfxcomEvent {
  houseCode: string;
  commandNumber: string;
  command: string;
  rssi: string;
}

interface RemoteEvent extends RfxcomEvent {
  houseCode: string;
  commandNumber: string;
  command: string;
  commandType: string;
  rssi: string;
}

interface Blinds2Event extends RfxcomEvent {
  unitCode: string;
  commandNumber: string;
  command: string;
  percent: string;
  angle: string;
  batteryLevel: string;
  rssi: string;
}

interface thermostat1Event extends RfxcomEvent {
  temperature: string;
  setpoint: string;
  modeNumber: string;
  mode: string;
  statusNumber: string;
  status: string;
  rssi: string;
}

interface Thermostat3Event extends RfxcomEvent {
  commandNumber: string;
  command: string;
}

interface Bbq3Event extends RfxcomEvent {
  temperature: string;
  batteryLevel: string;
  rssi: string;
}

interface TempEvent extends RfxcomEvent {
  temperature: string;
  batteryLevel: string;
  rssi: string;
}

interface TemprainEvent extends TempEvent {
  rainfall: string;
}

interface HumidityEvent extends RfxcomEvent {
  humidity: string;
  humidityStatus: string;
  batteryLevel: string;
  rssi: string;
}

interface TemphumidityEvent extends RfxcomEvent {
  temperature: string;
  humidity: string;
  humidityStatus: string;
  batteryLevel: string;
  rssi: string;
}

interface TemphumbaroEvent extends TemphumidityEvent {
  barometer: string;
  forecast: string;
}

interface RainEvent extends RfxcomEvent {
  rainfallIncrement?: string;
  rainfall?: string;
  rainfallRate?: string;
  batteryLevel: string;
  rssi: string;
}

interface WindEvent extends RfxcomEvent {
  gustSpeed: string;
  direction?: string;
  averageSpeed?: string;
  temperature?: string;
  chillfactor?: string;
  batteryLevel: string;
  rssi: string;
}

interface UvEvent extends RfxcomEvent {
  uv: string;
  temperature?: string;
  batteryLevel: string;
  rssi: string;
}

interface DateEvent extends RfxcomEvent {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  weekDay: string;
  batteryLevel: string;
  rssi: string;
}

type TodoRfxcomEvent = {
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
