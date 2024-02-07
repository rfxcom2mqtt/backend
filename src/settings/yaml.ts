import yaml from "js-yaml";
import fs from "fs";
import { KeyValue } from "../models/models";
import equals from "fast-deep-equal/es6";
import { logger } from "../libs/logger";

function read(file: string): KeyValue {
  try {
    const result = yaml.load(fs.readFileSync(file, "utf8"));
    return (result as KeyValue) ?? {};
  } catch (error: any) {
    if (error.name === "YAMLException") {
      error.file = file;
    }

    throw error;
  }
}

function readIfExists(file: string, default_?: KeyValue): KeyValue | undefined {
  return fs.existsSync(file) ? read(file) : default_;
}

function writeIfChanged(file: string, content: KeyValue): boolean {
  const before = readIfExists(file);
  if (!equals(before, content)) {
    logger.info("save config file");
    fs.writeFileSync(file, yaml.dump(content));
    return true;
  }
  return false;
}

function updateIfChanged(file: string, key: string, value: KeyValue): void {
  const content = read(file);
  if (content[key] !== value) {
    content[key] = value;
    writeIfChanged(file, content);
  }
}

export default { read, readIfExists, updateIfChanged, writeIfChanged };
