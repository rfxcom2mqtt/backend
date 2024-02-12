import { logger } from "../libs/logger";
import { Router } from "express";
import { Settings, SettingFrontend } from "../settings";
import expressStaticGzip from "express-static-gzip";
import serverStatic from "serve-static";
import path from "path";
import fs from "fs";
// @ts-ignore
import frontend from "@rfxcom2mqtt/frontend";

export default class Frontend {
  private frontConf: SettingFrontend;
  public router: Router;

  constructor(conf: Settings) {
    this.frontConf = conf.frontend;
    this.router = Router();

    let staticFrontend;
    if (process.env.PROFILE === "development") {
      logger.debug("display local developement frontend build");
      const buildPath = "../../../frontend/build/";
      const publicFiles = path.join(__dirname, buildPath);
      fs.writeFileSync(
        path.join(publicFiles, "config.js"),
        this.getFrontEndConfig(),
        "utf8",
      );
      this.listPublicFiles(publicFiles);
      staticFrontend = serverStatic(publicFiles);
    } else {
      frontend.setConfig(this.getFrontEndConfig());
      staticFrontend = expressStaticGzip(frontend.getPath(), {
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
    }
    this.router.use(staticFrontend);
  }

  getFrontEndConfig() {
    return (
      "window.config = { basePath: '" +
      (process.env.BASE_PATH ? process.env.BASE_PATH : "") +
      "', publicPath: '" +
      (process.env.PUBLIC_URL ? process.env.PUBLIC_URL : "") +
      "',};"
    );
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
