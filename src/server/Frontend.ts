import { logger } from "../utils/logger";
import { Router } from "express";
import expressStaticGzip from "express-static-gzip";
import serverStatic from "serve-static";
import path from "path";
import fs from "fs";
// @ts-ignore
import frontend from "@rfxcom2mqtt/frontend";

export default class Frontend {
  public router: Router;
  public pathStatic: string;

  getPath() {
    return this.pathStatic;
  }

  constructor() {
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
      this.pathStatic = publicFiles;
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
      this.pathStatic = frontend.getPath();
    }
    this.router.use(staticFrontend);

    //this.router.use("/devices",staticFrontend);
    //this.router.use("/devices/*/",staticFrontend);
    //this.router.use("/settings",staticFrontend);
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
