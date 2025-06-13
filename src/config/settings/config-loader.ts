import fs from "fs";
import yaml from "js-yaml";
import { KeyValue } from "../../core/models";

/**
 * Simple replacement for node-config-yaml to avoid shelljs warnings
 */
export default {
  load: (file: string): KeyValue => {
    try {
      const content = fs.readFileSync(file, "utf8");
      return yaml.load(content) as KeyValue || {};
    } catch (error: any) {
      if (error.name === "YAMLException") {
        error.file = file;
      }
      throw error;
    }
  }
};
