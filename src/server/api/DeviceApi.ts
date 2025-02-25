import { StatusCodes } from "http-status-codes";
import { Router, Request, Response } from "express";
import { Action } from "../../models/models";
import DeviceService from "../../services/DeviceService";
import { loggerFactory } from "../../utils/logger";
const logger = loggerFactory.getLogger("API");

export default class DeviceApi {
  public router: Router;

  constructor(deviceService: DeviceService, actionCallback: any) {
    this.router = Router();

    this.router.get("/", (req: Request, res: Response) => {
      const devices = deviceService.getAllDevices();
      res.status(StatusCodes.OK).json(devices);
    });

    this.router.get("/:id", (req: Request, res: Response) => {
      const id = req.params.id;
      const device = deviceService.getDeviceById(id);
      res.status(StatusCodes.OK).json(device);
    });

    this.router.post("/:id/rename", (req: Request, res: Response) => {
      const id = req.params.id;
      const newName = req.body?.name;
      deviceService.renameDevice(id, newName);
      res.status(StatusCodes.OK).json({});
    });

    this.router.get("/:id/state", (req: Request, res: Response) => {
      const id = req.params.id;
      logger.info("get device " + id + " states");
      res.status(StatusCodes.OK).json(deviceService.getDeviceById(id));
    });

    this.router.post("/:id/action", (req: Request, res: Response) => {
      const id = req.params.id;
      const action = req.body?.action;
      const entityId = req.body?.entityId;
      logger.info("device " + id + " action " + entityId + "." + action);
      actionCallback(new Action("device", action, id, entityId));
      res.status(StatusCodes.OK).json({});
    });

    this.router.post(
      "/:id/switch/:itemId/rename",
      (req: Request, res: Response) => {
        const id = req.params.id;
        const itemId = req.params.itemId;
        const newName = req.body?.name;
        const unitCode: number = parseInt(req.body?.unitCode);
        deviceService.renameDeviceSwitch(id, itemId, unitCode, newName);
        res.status(StatusCodes.OK).json({});
      },
    );
  }
}
