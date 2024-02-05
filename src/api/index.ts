import cookieParser from "cookie-parser";
import express, { Router, Request, Response, NextFunction } from "express";
//import expressWs from 'express-ws';
import { StatusCodes } from "http-status-codes";
import * as core from "express-serve-static-core";
import fs from "fs";
import logger from "../libs/logger";
import { Settings, SettingFrontend } from "../settings";
import expressStaticGzip from "express-static-gzip";
import StateStore, { DeviceStore } from "../store/state";
//import { RawData } from 'ws';
import { BridgeInfo } from "../models/models";
//import frontend from 'rfxcom2mqtt-frontend';
import Api from "./Api";

export default class Server {
  private server?: core.Express;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private frontConf: SettingFrontend;
  private api: Api;

  constructor(
    conf: Settings,
    devices: DeviceStore,
    state: StateStore,
    bridgeInfo: BridgeInfo,
  ) {
    this.frontConf = conf.frontend;
    this.api = new Api(conf, devices, state, bridgeInfo);
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
      this.server.use(express.json());
      this.server.use(express.urlencoded({ extended: true }));
      this.server.use(cookieParser());
    } else {
      this.server = express();
    }

    this.server.use(
      "/api",
      (req: Request, res: Response, next: NextFunction) => {
        this.authenticate(req, res, next);
      },
    );
    this.server.use("/api", this.api.router);

    //initialize the WebSocket server instance
    //const wss = expressWs(this.server);
    this.server.get("/", function (req: Request, res: Response, next) {
      logger.info("get route" + req);
      res.end();
    });

    //wss.app.ws('/', function(ws, req: Request) {
    //    ws.on('message', function(msg : RawData ) {
    //        logger.info(msg.toString());
    //    });
    //    logger.info('socket'+req);
    //  });

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

    const staticFrontend = expressStaticGzip("../frontend/build/", {
      enableBrotli: true,
      index: false,
      customCompressions: [
        {
          encodingName: "deflate",
          fileExtension: "zz",
        },
      ],
      orderPreference: ["br", "gz"],
    });
    this.server.use("*", staticFrontend);
    //this.server.use("/", expressStaticGzip( frontend.getPath()));

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
