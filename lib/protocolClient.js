import DHT from "hyperdht";
import net from "net";
import pump from "pump";
import { Subject } from "rxjs";
import WebSocket from "ws";
import Constants from "../constants.js";

/**
 * The IrisProtocol is used to connect peers with bi-directionaly communication between one another. This will change to offer more in the future.
 */
export default class IrisProtocolClient {
  /**
   * ### Introduction
   * The IrisProtocol is used to connect peers with bi-directionaly communication between one another. This will change to offer more in the future.
   *
   * ### Arguments
   * @param {Object} options The IrisProtocol class options object.
   * @param {DHT.keyPair} options.keyPair The HyperDHT keyPair that you would like to assign to the protocol instance. Or you can leave it and use the default.
   * @param {DHT} options.dht The HyperDHT instance that you would like to assign to the protocol instance. Or you can leave it and use the default.
   */
  constructor(topicHex, options = { keyPair: undefined, dht: undefined }) {
    if (!topicHex)
      return new Error("IrisProtocolClient needs to have a topicHex");

    this.keyPair = options.keyPair || DHT.keyPair();
    this.dht = options.dht || new DHT({});
    this.events = new Subject();

    this.wsServer = net.createServer((wssBridge) => {
      const socket = this.dht.connect(topicHex);
      pump(wssBridge, socket, wssBridge);
    });

    this.wsServer.listen(options.port || 0, "0.0.0.0", () => {
      this.socketAddress =
        "ws://" +
        this.wsServer.address().address +
        ":" +
        this.wsServer.address().port;

      this.socket = new WebSocket(this.socketAddress);

      this.socket.on("message", (rawPacket, _) => {
        this.events.next(rawPacket);
      });

      this.events.next(JSON.stringify({ type: Constants.LISTENING }));
    });
  }

  get publicKey() {
    return this.keyPair.publicKey;
  }
}
