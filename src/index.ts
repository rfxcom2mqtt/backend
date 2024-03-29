"use strict";
import dotenv from "dotenv";
dotenv.config({ path: getdotenvFile() });
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

process.on("SIGINT", handleQuit);
process.on("SIGTERM", handleQuit);
start();
