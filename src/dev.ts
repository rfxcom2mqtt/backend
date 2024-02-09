#!/usr/bin/env node
process.env["RFXCOM2MQTT_DATA"] = "./config/";
process.env["PROFILE"] = "development";

require("./index.ts");
