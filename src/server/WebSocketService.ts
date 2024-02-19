import { logger, loggerFactory, SocketioTransport } from "../utils/logger";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";

export default class WebSocketService {
  private messages = new Set();
  private messageExpirationTimeMS = 5 * 60 * 1000;
  private sockets?: Server;

  constructor() {}

  init(server: any) {
    logger.info("start init websocket");
    //initialize the WebSocket server instance
    this.sockets = new Server(server);
    const wss = this;

    loggerFactory.addTransport(new SocketioTransport(this.sockets));

    this.sockets.on("connect", (socket: Socket) => {
      logger.info("connect " + JSON.stringify(socket.data) + " " + socket.id);
      socket.on("message", () => (value) => this.handleMessage(value));
      socket.on("getMessage", () => wss.getMessages());
      wss.sendMessage({
        value: "init ws listener",
      });
      socket.on("ping", () => {
        logger.info("ping");
      });
    });

    logger.info("init websocket started");
  }

  sendMessage(message) {
    logger.info("send message " + message.value);
  }

  getMessages() {
    logger.info("getMessage");
    this.messages.forEach((message) => this.sendMessage(message));
  }

  handleMessage(value) {
    logger.info("handleMessage");
    const message = {
      id: uuidv4(),
      label: "Server",
      value: value,
      time: Date.now(),
    };

    this.messages.add(message);
    this.sendMessage(message);

    setTimeout(() => {
      this.messages.delete(message);
    }, this.messageExpirationTimeMS);
  }

  disconnect() {
    logger.info("disconnect");
  }
}
