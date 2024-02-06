import { Router } from "express";
import { Settings, SettingFrontend } from "../settings";
import expressStaticGzip from "express-static-gzip";
//import frontend from 'rfxcom2mqtt-frontend';

export default class Frontend {
  private frontConf: SettingFrontend;
  public router: Router;

  constructor(conf: Settings) {
    this.frontConf = conf.frontend;
    this.router = Router();

    const staticFrontend = expressStaticGzip("../../../frontend/build/", {
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
    this.router.use("/", staticFrontend);
    //this.server.use("/", expressStaticGzip( frontend.getPath()));
  }
}
