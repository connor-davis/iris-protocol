import DHT from "hyperdht";
import net from "net";
import pump from "pump";
import { Subject } from "rxjs";
import { WebSocketServer } from "ws";
import Constants from "../constants.js";
import { createReadStream, statSync } from "fs";
import progress from "progress-stream";

/**
 * The IrisProtocol is used to connect peers with bi-directionaly communication between one another.
 */
export default class IrisProtocolServer {
  /**
   * ### Introduction
   * The IrisProtocol is used to connect peers with bi-directionaly communication between one another.
   *
   * ### Arguments
   * @param {Object} options The IrisProtocol class options object.
   * @param {DHT.keyPair} options.keyPair The HyperDHT keyPair that you would like to assign to the protocol instance. Or you can leave it and use the default.
   * @param {DHT} options.dht The HyperDHT instance that you would like to assign to the protocol instance. Or you can leave it and use the default.
   */
  constructor(options = { keyPair: undefined, dht: undefined }) {
    this.keyPair = options.keyPair || DHT.keyPair();
    this.dht = options.dht || new DHT({});
    this.clients = [];

    this.events = new Subject();
    this.in = new Subject();
    this.out = new Subject();

    this.wssServer = new WebSocketServer({ port: 0, host: "0.0.0.0" });
    this.wssServer.on("listening", () => {
      this.wssServerPort = this.wssServer.address().port;

      this.wssServer.on("connection", (socket, _) => {
        this.out.subscribe((rawPacket) => socket.send(rawPacket));
        socket.on("message", (rawPacket) => this.in.next(rawPacket));
      });

      this.hyperServer = this.dht.createServer();

      this.hyperServer.on("listening", () => {
        this.hyperServer.on("connection", (socket) => {
          const serverBridge = net.connect(this.wssServerPort, "localhost");

          pump(socket, serverBridge, socket);
        });

        this.events.next(JSON.stringify({ type: Constants.LISTENING }));
      });

      (async () => {
        await this.hyperServer.listen(this.keyPair);
      })();
    });
  }

  get publicKey() {
    return this.keyPair.publicKey;
  }

  async createFileReadTunnel(filePath) {
    const fsKeyPair = DHT.keyPair();
    const fsServer = this.dht.createServer();
    const fileStat = statSync(filePath);

    const transferProgress = progress({
      length: fileStat.size,
      time: 100 /* ms */,
    });

    transferProgress.on("progress", function (progress) {
      console.log(progress);
    });

    fsServer.on("connection", (socket) => {
      createReadStream(filePath).pipe(transferProgress).pipe(socket);
    });

    await fsServer.listen(fsKeyPair);

    return fsKeyPair.publicKey;
  }
}
