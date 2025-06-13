"use strict";

import dotenv from "dotenv";
import Controller from "./core/Controller";
import { logger } from "./utils/logger";

// Load environment variables from the specified file
dotenv.config({ path: getEnvironmentFile() });

let controller: Controller;
let isShuttingDown = false;

/**
 * Determines which environment file to load based on command line arguments
 * @returns The path to the environment file to load
 */
function getEnvironmentFile(): string {
  const envFileArg = process.argv.find((arg) => arg.includes("--env-file="));

  if (envFileArg) {
    const envFile = envFileArg.replace("--env-file=", "");
    logger.info(`Loading environment from: ${envFile}`);
    return envFile;
  }

  return ".env";
}

/**
 * Handles application exit with optional restart capability
 * @param exitCode - The exit code to use
 * @param shouldRestart - Whether the application should restart
 */
function handleExit(exitCode: number, shouldRestart: boolean = false): void {
  if (!shouldRestart) {
    logger.info(`Application exiting with code: ${exitCode}`);
    process.exit(exitCode);
  }
}

/**
 * Starts the main application controller
 */
async function startApplication(): Promise<void> {
  try {
    logger.info("Starting RFXCOM2MQTT application");
    controller = new Controller(handleExit);
    await controller.start();
  } catch (error) {
    logger.error(`Failed to start application: ${error}`);
    process.exit(1);
  }
}

/**
 * Handles graceful shutdown on SIGINT and SIGTERM signals
 */
function handleGracefulShutdown(): void {
  if (!isShuttingDown && controller) {
    isShuttingDown = true;
    logger.info("Received shutdown signal, stopping application gracefully");
    controller.stop(false);
  }
}

// Register signal handlers for graceful shutdown
process.on("SIGINT", handleGracefulShutdown);
process.on("SIGTERM", handleGracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.error(error.stack || "No stack trace available");
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled promise rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start the application
startApplication();
