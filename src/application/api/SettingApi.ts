import { Router, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { settingsService } from "../../config/settings";

export default class SettingApi {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/", (req: Request, res: Response) => {
      res.status(StatusCodes.OK).json(settingsService.get());
    });
    this.router.post("/", (req: Request, res: Response) => {
      settingsService.apply(req.body);
      res.status(StatusCodes.OK).json(settingsService.get());
    });
  }
}
