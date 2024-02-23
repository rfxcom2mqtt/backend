export function getRfxcom2MQTTVersion(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageJSON = require("../../" + "package.json");
  return packageJSON.version;
}

export default { getRfxcom2MQTTVersion };

export class ProxyConfig {
  static getPublicPath() {
    return process.env.API_BASE_PATH ? process.env.API_BASE_PATH : "";
  }

  static getBasePath() {
    return process.env.API_BASE_PATH ? process.env.API_BASE_PATH : "";
  }

  static getSocketPath() {
    return ProxyConfig.getBasePath() + "/socket.io";
  }

  static getSocketNamespace() {
    return process.env.WS_NAMESPACE ? process.env.WS_NAMESPACE : "";
  }
}
