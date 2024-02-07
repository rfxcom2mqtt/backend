#!/usr/bin/env node
process.env["RFXCOM2MQTT_DATA"] = "./config/";

require("./index.ts");
