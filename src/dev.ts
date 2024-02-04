#!/usr/bin/env node
process.env["RFXCOM2MQTT_CONFIG"] = "./config/config.yml";
process.env["RFXCOM2MQTT_DATA_STATE"] = "./config/state.json";

require("./index.ts");
