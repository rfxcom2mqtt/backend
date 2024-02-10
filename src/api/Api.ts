import { StatusCodes } from "http-status-codes";
import { Router, Request, Response, NextFunction } from "express";
import { logger } from "../libs/logger";
import { Settings, SettingFrontend, settingsService } from "../settings";
import StateStore, { DeviceStore } from "../store/state";
import { BridgeInfo, DeviceState } from "../models/models";

export default class Api {
  private frontConf: SettingFrontend;
  public router: Router;
  private state: StateStore;
  private bridgeInfo: BridgeInfo;
  private actionCallback: any;

  constructor(
    conf: Settings,
    devices: DeviceStore,
    state: StateStore,
    bridgeInfo: BridgeInfo,
    actionCallback: any,
  ) {
    this.frontConf = conf.frontend;
    this.bridgeInfo = bridgeInfo;
    this.actionCallback = actionCallback;
    this.router = Router();
    this.router.get("/", (req: Request, res: Response, next: NextFunction) => {
      return this.onApiRequest(req, res, next);
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

    this.router.get("/devices/:id", (req: Request, res: Response) => {
      const id = req.params.id;
      logger.info("get device " + id + " info");
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json(devices.get(id));
    });

    this.router.get("/devices/:id/state", (req: Request, res: Response) => {
      const id = req.params.id;
      logger.info("get device " + id + " states");
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json(state.getByDeviceId(id));
    });

    this.router.get("/bridge/info", (req: Request, res: Response) => {
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json(this.bridgeInfo);
    });

    this.router.post("/bridge/action", (req: Request, res: Response) => {
      const action = req.body?.action;
      if (action === "restart") {
        actionCallback(action);
      }
      res
        .header("Access-Control-Allow-Origin", "*")
        .status(StatusCodes.OK)
        .json({});
    });

    this.state = state;
  }

  private onApiRequest(req: Request, res: Response, next: NextFunction): any {
    logger.info(
      "onRequest " +
        req.method +
        " " +
        req.originalUrl +
        " body :" +
        JSON.stringify(req.body),
    );
    return next();
  }
}
