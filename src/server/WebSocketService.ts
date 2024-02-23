import {
  logger,
  loggerFactory,
  SocketioTransport,
  LogEventListener,
} from "../utils/logger";
import { Server, Socket, Namespace } from "socket.io";
import { ProxyConfig } from "../utils/utils";

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

    loggerFactory.addTransport(new SocketioTransport(this.sockets, this));

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
    this.messages.add(value);
  }

  disconnect() {
    logger.info("disconnect");
  }
}
