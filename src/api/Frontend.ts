import { logger } from "../libs/logger";
import { Router } from "express";
import { Settings, SettingFrontend } from "../settings";
import expressStaticGzip from "express-static-gzip";
import fs from "fs";
// @ts-ignore
import frontend from "@rfxcom2mqtt/frontend";

export default class Frontend {
  private frontConf: SettingFrontend;
  public router: Router;

  constructor(conf: Settings) {
    this.frontConf = conf.frontend;
    this.router = Router();

    const staticFrontend = expressStaticGzip(frontend.getPath(), {
      enableBrotli: true,
      index: "index.html",
      customCompressions: [
        {
          encodingName: "deflate",
          fileExtension: "zz",
        },
      ],
      orderPreference: ["br", "gz"],
    });
    this.router.use(staticFrontend);
  }

  listPublicFiles(directoryPath: string) {
    fs.readdir(directoryPath, function (err, files) {
      //handling error
      if (err) {
        return logger.info("Unable to scan directory: " + err);
      }
      //listing all files using forEach
      files.forEach(function (file) {
        // Do whatever you want to do with the file
        logger.debug(file);
      });
    });
  }
}
