import { StatusCodes } from "http-status-codes";
import { Router, Request, Response } from "express";
import { logger } from "../../utils/logger";
import Discovery from "../../discovery";
import StateStore, { DeviceStore } from "../../store/state";
import { Action, DeviceStateStore } from "../../models/models";
import { lookup } from "../../discovery/Homeassistant";
import { settingsService } from "../../settings";

export default class DeviceApi {
  public router: Router;

  constructor(
    devicesStore: DeviceStore,
    state: StateStore,
    discovery: Discovery,
    actionCallback: any,
  ) {
    this.router = Router();

    this.router.get("/", (req: Request, res: Response) => {
      const devices = devicesStore.getAll();
      for (const index in devices) {
        const device = new DeviceStateStore(devices[index]);
        device.overrideDeviceInfo();
      }
      res.status(StatusCodes.OK).json(devices);
    });

    this.router.get("/:id", (req: Request, res: Response) => {
      const id = req.params.id;
      logger.info("get device " + id + " info");

      const device = new DeviceStateStore(devicesStore.get(id));
      device.overrideDeviceInfo();

      for (const index in device.getSensors()) {
        const sensor = device.getSensors()[index];
        device.getSensors()[index] = {
          ...sensor,
          ...lookup[sensor.type],
        };
      }
      res.status(StatusCodes.OK).json(device.state);
    });

    this.router.post("/:id/rename", (req: Request, res: Response) => {
      const id = req.params.id;
      const newName = req.body?.name;
      logger.info("rename device " + id + " to " + newName);
      settingsService.applyDeviceOverride({
        id: id,
        name: newName,
      });
      const device = new DeviceStateStore(devicesStore.get(id));
      device.overrideDeviceInfo();
      devicesStore.set(id, device.state);
      discovery.publishDiscoveryDeviceToMqtt(
        device,
        settingsService.get().homeassistant.discovery_device,
      );
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

    this.router.post(
      "/:id/switch/:itemId/rename",
      (req: Request, res: Response) => {
        const id = req.params.id;
        const itemId = req.params.itemId;
        const newName = req.body?.name;
        const unitCode: number = parseInt(req.body?.unitCode);
        logger.info(
          "rename  device " + id + " sensor " + itemId + " to " + newName,
        );
        settingsService.applyDeviceOverride({
          id: id,
          units: [{ unitCode: unitCode, name: newName }],
        });

        const device = new DeviceStateStore(devicesStore.get(id));
        device.overrideDeviceInfo();
        devicesStore.set(id, device.state);
        discovery.publishDiscoveryDeviceToMqtt(
          device,
          settingsService.get().homeassistant.discovery_device,
        );

        res.status(StatusCodes.OK).json({});
      },
    );
  }
}
