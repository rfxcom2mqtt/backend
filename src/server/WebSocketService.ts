import { logger, SocketioTransport } from "../utils/logger";
import { Server, Socket } from 'socket.io';
import {v4 as uuidv4} from 'uuid';

export default class WebSocketService {

  private messages = new Set();
  private messageExpirationTimeMS = 5*60 * 1000;
  private sockets?: Server;


  constructor() {
  }

  init(server: any) {
    logger.info("init");
    //initialize the WebSocket server instance
    this.sockets = new Server(server);
    const wss = this;

    logger.addTransport( new SocketioTransport(this.sockets));

    this.sockets.on('connect',(socket: Socket) => {
      logger.info("connect "+JSON.stringify(socket.data)+ " "+socket.id);
      socket.on('message',() => (value) => this.handleMessage(value));
      socket.on('getMessage',() => wss.getMessages());
      wss.sendMessage({  id: "sdf",
        user: "server",
        value: "init listener",
        time: Date.now()
      });
      socket.on("ping", () => {
        logger.info("ping");
      });
    });
   
    
  
  }

  sendMessage(message) {
    logger.info("send message "+message.value );
    this.sockets?.emit('message', message);
  }
  
  getMessages() {
    logger.info("getMessage");
    this.messages.forEach((message) => this.sendMessage(message));
  }

  handleMessage(value) {
    logger.info("handleMessage");
    const message = {
      id: uuidv4(),
      user: "me",
      value: value,
      time: Date.now()
    };

    this.messages.add(message);
    this.sendMessage(message);

    setTimeout(
      () => {
        this.messages.delete(message);
       // this.sockets.emit('deleteMessage', message.id);
      },
      this.messageExpirationTimeMS,
    );
  }

  disconnect() {
    logger.info("disconnect");
  }
}
