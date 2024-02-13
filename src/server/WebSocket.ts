import { logger } from "../utils/logger";
import { Router } from "express";
import { Settings, SettingFrontend } from "../settings";
//import { RawData } from 'ws';
//import expressWs from 'express-ws';

export default class WebSocket {
  private frontConf: SettingFrontend;

  constructor(conf: Settings) {
    this.frontConf = conf.frontend;
  }

  init(server: any) {
    //initialize the WebSocket server instance
    //const wss = expressWs(server);
    //wss.app.ws('/', function(ws, req: Request) {
    //    ws.on('message', function(msg : RawData ) {
    //        logger.info(msg.toString());
    //    });
    //    logger.info('socket'+req);
    //  });
  }
}
