#!/usr/bin/env node
process.env["RFXCOM2MQTT_DATA"] = "./config/";
process.env["PROFILE"] = "development";
process.env["BASE_PATH"] = "/rfxcom";

require("./index.ts");
