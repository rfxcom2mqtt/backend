"use strict";
import dotenv from "dotenv";
dotenv.config({ path: getdotenvFile() });
const logger = require("./utils/logger");
import Controller from "./Controller";

let controller: Controller;
let stopping = false;

function getdotenvFile() {
  if (
    process.argv[2] !== undefined &&
    process.argv[2].includes("--env-file=")
  ) {
    console.log("args : " + process.argv[2]);
    const envFile = process.argv[2].replace("--env-file=", "");
    console.log("envFile : " + envFile);
    return envFile;
  }
  return ".env";
}

function exit(code: number, restart: boolean = false) {
  if (!restart) {
    process.exit(code);
  }
}

async function start() {
  controller = new Controller(exit);
  await controller.start();
}

function handleQuit() {
  if (!stopping && controller) {
    stopping = true;
    controller.stop(false);
  }
}

process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down...");
  handleQuit();
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down...");
  handleQuit();
});
start();
