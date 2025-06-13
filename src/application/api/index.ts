import { Router, Request, Response, NextFunction } from "express";
import Discovery from "../../adapters/discovery";
import { BridgeInfo } from "../../core/models";
import StateStore, { DeviceStore } from "../../core/store/state";
import { loggerFactory } from "../../utils/logger";
import BridgeApi from "./BridgeApi";
import DeviceApi from "./DeviceApi";
import SettingApi from "./SettingApi";

const logger = loggerFactory.getLogger("API");

export default class Api {
  public router: Router;

  constructor(
    devices: DeviceStore,
    state: StateStore,
    discovery: Discovery,
    bridgeInfo: BridgeInfo,
    actionCallback: any,
  ) {
    this.router = Router();
    this.router.use("*", (req: Request, res: Response, next: NextFunction) => {
      return this.onApiRequest(req, res, next);
    });

    const settingApi = new SettingApi();
    this.router.use("/settings", settingApi.router);

    const deviceApi = new DeviceApi(devices, state, discovery, actionCallback);
    this.router.use("/devices", deviceApi.router);

    const bridgeApi = new BridgeApi(bridgeInfo, actionCallback);
    this.router.use("/bridge", bridgeApi.router);
  }

  private onApiRequest(req: Request, res: Response, next: NextFunction): any {
    logger.info(
      "onRequest " +
        req.method.toUpperCase() +
        " " +
        req.originalUrl +
        " body :" +
        JSON.stringify(req.body),
    );
    return next();
  }
}
