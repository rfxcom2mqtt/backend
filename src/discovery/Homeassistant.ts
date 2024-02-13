"use strict";

import { KeyValue } from "../models/models";

export const lookup: { [s: string]: KeyValue } = {
  battery: {
    device_class: "battery",
    entity_category: "diagnostic",
    state_class: "measurement",
    unit_of_measurement: "%",
  },
  battery_voltage: {
    device_class: "voltage",
    entity_category: "diagnostic",
    icon: "mdi:sine-wave",
    state_class: "measurement",
    enabled_by_default: true,
  },
  co2: { device_class: "carbon_dioxide", state_class: "measurement" },
  temperature: {
    device_class: "temperature",
    state_class: "measurement",
    icon: "mdi:temperature-celsius",
    unit_of_measurement: "°C",
  },
  energy: {
    device_class: "energy",
    entity_category: "diagnostic",
    state_class: "total_increasing",
  },
  humidity: {
    device_class: "humidity",
    state_class: "measurement",
    icon: "mdi:humidity",
    unit_of_measurement: "%",
  },
  linkquality: {
    enabled_by_default: false,
    entity_category: "diagnostic",
    icon: "mdi:signal",
    state_class: "measurement",
    unit_of_measurement: "dBm",
  },
  power: {
    device_class: "power",
    entity_category: "diagnostic",
    state_class: "measurement",
  },
  pressure: {
    device_class: "atmospheric_pressure",
    state_class: "measurement",
    unit_of_measurement: "hPa",
  },
  uv: {
    state_class: "measurement",
    icon: "mdi:sunglasses",
    unit_of_measurement: "UV index",
  },
  weight: {
    device_class: "weight",
    state_class: "measurement",
    icon: "mdi:weight",
    unit_of_measurement: "Kg",
  },
  count: { entity_category: "diagnostic", state_class: "measurement" },
};
