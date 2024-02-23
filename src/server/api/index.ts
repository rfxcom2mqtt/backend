import { Router, Request, Response, NextFunction } from "express";
import StateStore, { DeviceStore } from "../../store/state";
import { BridgeInfo } from "../../models/models";
import Discovery from "../../discovery";
import DeviceApi from "./DeviceApi";
import BridgeApi from "./BridgeApi";
import SettingApi from "./SettingApi";

import { loggerFactory } from "../../utils/logger";
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
