import { logger } from "../libs/logger";
import express, { Router } from "express";
import { Settings, SettingFrontend } from "../settings";
import expressStaticGzip from "express-static-gzip";
import serverStatic from "serve-static";
import path from "path";
import fs from "fs";
// @ts-ignore
//import frontend from "rfxcom2mqtt-frontend";

export default class Frontend {
  private frontConf: SettingFrontend;
  public router: Router;

  constructor(conf: Settings) {
    this.frontConf = conf.frontend;
    this.router = Router();

    /* const staticFrontend = expressStaticGzip(__dirname+"/../../../frontend/build/", {
      enableBrotli: true,
      index: "index.html",
      customCompressions: [
        {
          encodingName: "deflate",
          fileExtension: "zz",
        },
      ],
      orderPreference: ["br", "gz"],
    });*/

    const publicFiles = path.join(__dirname, "../../../frontend/build/");
    // this.listPublicFiles(frontend.getPath())
    const staticFrontend = serverStatic(publicFiles);
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
