export class RfxcomInfo {
  receiverTypeCode: number = 0;
  receiverType: string = "";
  hardwareVersion: string = "";
  firmwareVersion: number = 0;
  firmwareType: string = "";
  enabledProtocols: string[] = [];
}

export interface RfxcomEvent {
  id: string;
  deviceName?: string; // computed value
  subtype: number;
  subTypeValue?: string; // computed value
  seqnbr: number;
  type: string;
  group: boolean;
}

export interface CommandRfxcomEvent extends RfxcomEvent {
  commandNumber: number;
  command: string;
  rssi: number;
}

interface Lighting1Event extends CommandRfxcomEvent {
  houseCode: string;
  unitCode: string;
}

export interface Lighting2Event extends CommandRfxcomEvent {
  unitCode: string;
  level: number;
}

export interface Lighting4Event extends CommandRfxcomEvent {
  data: string;
  pulseWidth: string;
}

interface Lighting5Event extends CommandRfxcomEvent {
  unitCode: string;
  level: string;
}

interface Lighting6Event extends CommandRfxcomEvent {
  groupCode: string;
  unitCode: string;
}

interface ChimeEvent extends CommandRfxcomEvent {}

interface FanEvent extends CommandRfxcomEvent {
  state: string;
  co2: string;
}

interface Blinds1Event extends CommandRfxcomEvent {
  unitCode: number;
  batteryLevel: number;
}

interface EdisioEvent extends CommandRfxcomEvent {
  unitCode: number;
  level: number;
  colour: string;
  maxRepeat: number;
  repeatCount: number;
  batteryVoltage: number;
  extraBytes: string;
}

interface ActivLinkEvent extends CommandRfxcomEvent {
  alert: string;
  deviceStatus: string;
  batteryLevel: number;
}

interface FunkbusEvent extends CommandRfxcomEvent {
  groupCode: string;
  commandTime: string;
  deviceTypeNumber: number;
  sceneNumber: number;
  channelNumber: number;
}

interface HunterfanEvent extends CommandRfxcomEvent {}

export interface Security1Event extends RfxcomEvent {
  deviceStatus: string;
  status: string;
  tampered: string;
  batteryLevel: string;
  rssi: number;
}

interface Camera1Event extends CommandRfxcomEvent {
  houseCode: string;
}

interface RemoteEvent extends CommandRfxcomEvent {
  houseCode: string;
  commandType: string;
}

interface Blinds2Event extends CommandRfxcomEvent {
  unitCode: string;
  percent: string;
  angle: string;
  batteryLevel: number;
}

interface thermostat1Event extends RfxcomEvent {
  temperature: string;
  setpoint: string;
  modeNumber: number;
  mode: string;
  statusNumber: number;
  status: string;
  rssi: number;
}

interface Thermostat3Event extends CommandRfxcomEvent {}

export interface Bbq1Event extends RfxcomEvent {
  temperature: string;
  batteryLevel: number;
  rssi: number;
}

export interface TempEvent extends RfxcomEvent {
  temperature: string;
  batteryLevel: number;
  rssi: number;
}

interface TemprainEvent extends TempEvent {
  rainfall: string;
}

export interface HumidityEvent extends RfxcomEvent {
  humidity: string;
  humidityStatus: string;
  batteryLevel: number;
  rssi: number;
}

export interface TemphumidityEvent extends RfxcomEvent {
  temperature: string;
  humidity: string;
  humidityStatus: string;
  batteryLevel: number;
  rssi: number;
}

export interface TemphumbaroEvent extends TemphumidityEvent {
  barometer: string;
  forecast: string;
}

interface RainEvent extends RfxcomEvent {
  rainfallIncrement?: number;
  rainfall?: number;
  rainfallRate?: number;
  batteryLevel: number;
  rssi: number;
}

interface WindEvent extends RfxcomEvent {
  gustSpeed: string;
  direction?: string;
  averageSpeed?: string;
  temperature?: string;
  chillfactor?: string;
  batteryLevel: number;
  rssi: number;
}

export interface UvEvent extends RfxcomEvent {
  uv: number;
  temperature?: string;
  batteryLevel: number;
  rssi: number;
}

interface DateEvent extends RfxcomEvent {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  weekDay: string;
  batteryLevel: number;
  rssi: number;
}

interface Elec1Event extends RfxcomEvent {
  energy: number;
  count: number;
  current: number;
  batteryLevel: number;
  rssi: number;
}

interface Elec23Event extends RfxcomEvent {
  energy: number;
  count: number;
  power: number;
  batteryLevel: number;
  rssi: number;
}

interface Elec4Event extends RfxcomEvent {
  energy: number;
  count: number;
  current: number;
  batteryLevel: number;
  rssi: number;
}

interface Elec5Event extends RfxcomEvent {
  voltage: number;
  current: number;
  power: number;
  energy: number;
  powerFactor: number;
  frequency: number;
  rssi: number;
}

export interface WeightEvent extends RfxcomEvent {
  weight: number;
  batteryLevel: number;
  rssi: number;
}

interface CartelectronicEvent extends RfxcomEvent {
  identifiantCompteur: string;
  typeContrat: string;
  periodeTarifaireEnCours: string;
  compteur: string[];
  avertissemntJourEJP: string;
  avertissementCouleurAujourdHui: string;
  avertissementCouleurDemain: string;
  puissanceApparenteValide: boolean;
  puissanceApparente: string;
  teleInfoPresente: string;
  tensionMoyenne: string;
  indexTariffaireEnCours: string;
  unknownSubtype: boolean;
  batteryLevel: number;
  rssi: number;
}

interface RfxsensorEvent extends RfxcomEvent {
  message: string;
  rssi: number;
}

interface RfxmeterEvent extends RfxcomEvent {
  counter: number;
  rssi: number;
}

export interface WaterlevelEvent extends RfxcomEvent {
  temperature: string;
  level: number;
  batteryLevel: number;
  rssi: number;
}

interface LightningEvent extends RfxcomEvent {
  status: string;
  distance: string;
  strikes: string;
  batteryLevel: number;
  rssi: number;
  valid: boolean;
}

interface WeatherEvent extends RfxcomEvent {
  temperature: string;
  averageSpeed: number;
  gustSpeed: number;
  rssi: number;
  rainfallIncrement: string;
  // for subtype 0
  direction?: string;
  humidity?: string;
  humidityStatus?: string;
  uv?: string;
  insolation?: string;
  batteryLevel?: string;
}

interface SolarEvent extends RfxcomEvent {
  insolation: string;
  batteryLevel: number;
  rssi: number;
}
