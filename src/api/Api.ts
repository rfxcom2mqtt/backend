import { StatusCodes } from "http-status-codes";
import { Router, Request, Response } from "express";
import { logger } from "../libs/logger";
import { Settings, SettingFrontend, settingsService } from "../settings";
import StateStore, { DeviceStore } from "../store/state";
import { BridgeInfo } from "../models/models";

export default class Api {
  private frontConf: SettingFrontend;
  public router: Router;
  private state: StateStore;
  private bridgeInfo: BridgeInfo;

  constructor(
    conf: Settings,
    devices: DeviceStore,
    state: StateStore,
    bridgeInfo: BridgeInfo,
  ) {
    this.frontConf = conf.frontend;
    this.bridgeInfo = bridgeInfo;
    this.router = Router();
    this.router.get("/", (req: Request, res: Response) => {
      return this.onApiRequest(req, res);
    });
    this.router.get("/settings", (req: Request, res: Response) => {
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json(settingsService.get());
    });
    this.router.post("/settings", (req: Request, res: Response) => {
      settingsService.apply(req.body);
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json(settingsService.get());
    });

    this.router.get("/devices", (req: Request, res: Response) => {
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json(devices.getAll());
    });

    this.router.get("/devices/status", (req: Request, res: Response) => {
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json(state.getAll());
    });

    this.router.get("/bridge/info", (req: Request, res: Response) => {
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json(this.bridgeInfo);
    });

    this.state = state;
  }

  private onApiRequest(req: Request, res: Response): any {
    logger.info("onRequest " + req.originalUrl + " body :" + req.body);
    return res.status(StatusCodes.OK).json({});
  }
}
