import { StatusCodes } from "http-status-codes";
import { Router, Request, Response } from "express";
import { logger } from "../../utils/logger";
import StateStore, { DeviceStore } from "../../store/state";
import { Action } from "../../models/models";
import { lookup } from "../../discovery/Homeassistant";

export default class DeviceApi {
  public router: Router;

  constructor(devices: DeviceStore, state: StateStore, actionCallback: any) {
    this.router = Router();

    this.router.get("/", (req: Request, res: Response) => {
      res.status(StatusCodes.OK).json(devices.getAll());
    });

    this.router.get("/:id", (req: Request, res: Response) => {
      const id = req.params.id;
      logger.info("get device " + id + " info");

      const device = devices.get(id);
      for (const index in device.sensors) {
        const sensor = device.sensors[index];
        device.sensors[index] = {
          ...sensor,
          ...lookup[sensor.type],
        };
      }
      res.status(StatusCodes.OK).json(device);
    });

    this.router.post("/:id/rename", (req: Request, res: Response) => {
      const id = req.params.id;
      const newName = req.body?.name;
      logger.info("rename device " + id+ " to "+newName);
      
      res.status(StatusCodes.OK).json({});
    });

    this.router.get("/:id/state", (req: Request, res: Response) => {
      const id = req.params.id;
      logger.info("get device " + id + " states");
      res.status(StatusCodes.OK).json(state.getByDeviceId(id));
    });

    this.router.post("/:id/action", (req: Request, res: Response) => {
      const id = req.params.id;
      const action = req.body?.action;
      const entityId = req.body?.entityId;
      logger.info("device " + id + " action " + entityId + "." + action);
      actionCallback(new Action("device", action, id, entityId));
      res.status(StatusCodes.OK).json({});
    });

    this.router.post("/:id/sensor/:sensorId/rename", (req: Request, res: Response) => {
      const id = req.params.id;
      const sensorId = req.params.sensorId;
      const newName = req.body?.name;
      logger.info("rename  device " + id + " sensor " + sensorId + " to " + newName);
     
      res.status(StatusCodes.OK).json({});
    });
  }
}
