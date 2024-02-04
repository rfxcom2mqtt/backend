export function getRfxcom2MQTTVersion(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageJSON = require("../../" + "/package.json");
  return packageJSON.version;
}

export default { getRfxcom2MQTTVersion };
