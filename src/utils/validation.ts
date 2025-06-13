import { logger } from "./logger";

/**
 * Validates if a topic follows the expected MQTT topic structure
 * @param topic - The MQTT topic to validate
 * @param expectedBaseTopic - The expected base topic
 * @returns boolean indicating if the topic is valid
 */
export function validateMqttTopic(
  topic: string,
  expectedBaseTopic: string,
): boolean {
  if (!topic || !expectedBaseTopic) {
    return false;
  }

  const topicParts = topic.split("/");
  return topicParts[0] === expectedBaseTopic;
}

/**
 * Validates if a device ID is in the correct format
 * @param deviceId - The device ID to validate
 * @returns boolean indicating if the device ID is valid
 */
export function validateDeviceId(deviceId: string): boolean {
  if (!deviceId || typeof deviceId !== "string") {
    return false;
  }

  // Device ID should not be empty and should not contain invalid characters
  return deviceId.trim().length > 0 && !/[<>:"/\\|?*]/.test(deviceId);
}

/**
 * Validates if a file path exists and is readable
 * @param filePath - The file path to validate
 * @returns boolean indicating if the file is valid
 */
export function validateFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  try {
    const fs = require("fs");
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (error) {
    logger.error(`File validation error for ${filePath}: ${error}`);
    return false;
  }
}

/**
 * Validates MQTT QoS level
 * @param qos - The QoS level to validate
 * @returns boolean indicating if the QoS is valid
 */
export function validateQoS(qos: number): boolean {
  return [0, 1, 2].includes(qos);
}

/**
 * Validates MQTT protocol version
 * @param version - The protocol version to validate
 * @returns boolean indicating if the version is valid
 */
export function validateMqttProtocolVersion(version: number): boolean {
  return [3, 4, 5].includes(version);
}

/**
 * Sanitizes a string to be safe for use in file names or topics
 * @param input - The string to sanitize
 * @returns sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * Validates if a port number is valid
 * @param port - The port number to validate
 * @returns boolean indicating if the port is valid
 */
export function validatePort(port: string | number): boolean {
  const portNum = typeof port === "string" ? parseInt(port, 10) : port;
  return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
}
