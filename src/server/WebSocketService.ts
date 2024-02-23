import {
  loggerFactory,
  LogEventTransport,
  LogEventListener,
} from "../utils/logger";
import { Server, Socket, Namespace } from "socket.io";
import { ProxyConfig } from "../utils/utils";
import { v4 as uuidv4 } from "uuid";

const logger = loggerFactory.getLogger("WEBSOCKET");


export default class WebSocketService implements LogEventListener {
  private messages = new Set();
  private messageExpirationTimeMS = 5 * 60 * 1000;
  private sockets?: Namespace;

  constructor() {}

  init(server: any) {
    logger.info("start init websocket");
    //initialize the WebSocket server instance
    this.sockets = new Server(server, { path: "/socket.io" }).of(
      ProxyConfig.getSocketNamespace(),
    )!!;
    const wss = this;

    loggerFactory.addTransport(new LogEventTransport(this));

    this.sockets.on("connect", (socket: Socket) => {
      this.getAllLogs();
      logger.info("connect " + JSON.stringify(socket.data) + " " + socket.id);
      socket.on("getAllLogs", () => wss.getAllLogs());
      logger.info("init ws listener");
      socket.on("ping", () => {
        logger.info("ping");
      });
    });

    logger.info("init websocket started");
  }

  sendLog(message) {
    this.sockets?.emit("log", message);
  }

  getAllLogs() {
    this.messages.forEach((message) => this.sendLog(message));
  }

  onLog(value) {
    const logEvent = {
      id: uuidv4(),
      level: value.level,
      value: value.message,
      label: value.label,
      time: value.timestamp,
    };
    this.messages.add(logEvent);
    setImmediate(() => {
      this.sockets?.emit("logged", value);
    });

    
    // Send the log message via Socket.IO
    this.sendLog(logEvent);
    
  }

  disconnect() {
    logger.info("disconnect");
  }
}
