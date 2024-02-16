import { StatusCodes } from "http-status-codes";
import { Router, Request, Response } from "express";
import { BridgeInfo, Action } from "../../models/models";

export default class BridgeApi {
  public router: Router;
  private bridgeInfo: BridgeInfo;

  constructor(bridgeInfo: BridgeInfo, actionCallback: any) {
    this.bridgeInfo = bridgeInfo;
    this.router = Router();

    this.router.get("/info", (req: Request, res: Response) => {
      res.status(StatusCodes.OK).json(this.bridgeInfo);
    });

    this.router.post("/action", (req: Request, res: Response) => {
      const action = req.body?.action;
      actionCallback(new Action("bridge", action));
      res.status(StatusCodes.OK).json({});
    });
  }
}
