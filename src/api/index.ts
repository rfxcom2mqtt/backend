import cookieParser from "cookie-parser";
import express, { Request, Response, NextFunction } from "express";

import { StatusCodes } from "http-status-codes";
import * as core from "express-serve-static-core";
import fs from "fs";
import { logger } from "../libs/logger";
import { Settings, SettingFrontend } from "../settings";
import StateStore, { DeviceStore } from "../store/state";
import { BridgeInfo } from "../models/models";
import Api from "./Api";
import Frontend from "./Frontend";

export default class Server {
  private server?: core.Express;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private frontConf: SettingFrontend;
  private api: Api;
  private frontend: Frontend;

  constructor(
    conf: Settings,
    devices: DeviceStore,
    state: StateStore,
    bridgeInfo: BridgeInfo,
  ) {
    this.frontConf = conf.frontend;
    this.api = new Api(conf, devices, state, bridgeInfo);
    this.frontend = new Frontend(conf);
  }

  private authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (this.frontConf.authToken) {
      if (authHeader && authHeader !== "null") {
        const token = authHeader.split(" ")[1];
        logger.info("auth Header");
        const isAuthenticated = this.frontConf.authToken === token;
        if (!isAuthenticated) {
          res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ success: false, message: "UnAuthorized" });
        } else {
          next();
        }
      } else {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ success: false, message: "not configured" });
      }
    } else {
      next();
    }
  }

  private isHttpsConfigured(): boolean {
    if (this.frontConf.sslCert && this.frontConf.sslKey) {
      if (
        !fs.existsSync(this.frontConf.sslCert) ||
        !fs.existsSync(this.frontConf.sslKey)
      ) {
        logger.error(
          `defined ssl_cert '${this.frontConf.sslCert}' or ssl_key '${this.frontConf.sslKey}' file path does not exists, server won't be secured.`,
        ); /* eslint-disable-line max-len */
        return false;
      }
      return true;
    }
    return false;
  }

  async start(): Promise<void> {
    logger.info("Server Starting");
    if (this.isHttpsConfigured()) {
      const serverOptions = {
        key: fs.readFileSync(this.frontConf.sslKey),
        cert: fs.readFileSync(this.frontConf.sslCert),
      };
      this.server = express();
    } else {
      this.server = express();
    }

    this.server.use(express.json());
    this.server.use(express.urlencoded({ extended: true }));
    this.server.use(cookieParser());

    this.server.use(this.frontend.router);
    this.server.use(
      "/api",
      (req: Request, res: Response, next: NextFunction) => {
        this.authenticate(req, res, next);
      },
    );
    this.server.use("/api", this.api.router);

    this.server.use(function (req: Request, res: Response, next: NextFunction) {
      logger.info(
        req.method + " " + req.originalUrl + " : " + JSON.stringify(req.body),
      );
      next();
    });

    /* istanbul ignore next */
    const options = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHeaders: (res: any, path: string): void => {
        if (path.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-store");
        }
      },
    };

    if (!this.frontConf.host) {
      this.server.listen(this.frontConf.port),
        () => {
          logger.info(`Started frontend on port ${this.frontConf.port}`);
        };
    } else if (this.frontConf.host.startsWith("/")) {
      this.server.listen(this.frontConf.host, () => {
        logger.info(`Started frontend on socket ${this.frontConf.host}`);
      });
    } else {
      this.server.listen(this.frontConf.port, this.frontConf.host, () => {
        logger.info(
          `Started frontend on port ${this.frontConf.host}:${this.frontConf.port}`,
        );
      });
    }

    this.server.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.error(err.message + " " + err);
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: err.message,
        });
      },
    );
  }

  async stop(): Promise<void> {
    logger.info("Controller stop");
  }
}
