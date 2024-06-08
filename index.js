import { EventEmitter } from "events";
import DHT from "hyperdht";
import Constants from "./constants.js";
import { v4 } from "uuid";

/**
 * The IrisProtocol is used to connect peers with bi-directionaly communication between one another. This will change to offer more in the future.
 */
export default class IrisProtocol extends EventEmitter {
  /**
   * ### Introduction
   * The IrisProtocol is used to connect peers with bi-directionaly communication between one another. This will change to offer more in the future.
   *
   * ### Arguments
   * @param {Object} options The IrisProtocol class options object.
   * @param {DHT.keyPair} options.keyPair The HyperDHT keyPair that you would like to assign to the protocol instance. Or you can leave it and use the default.
   * @param {DHT} options.dht The HyperDHT instance that you would like to assign to the protocol instance. Or you can leave it and use the default.
   */
  constructor(options = { keyPair: undefined, timeout: undefined }) {
    super();

    const { keyPair, dht } = options; // Customized options.

    this.keyPair = keyPair || DHT.keyPair(); // HyperDHT keyPair.

    this.dht = dht || new DHT({}); // HyperDHT instance node.

    this.server = this.dht.createServer(
      this._handleServerConnection.bind(this)
    ); // HyperDHT server instance.
    this.connectedPublicKeys = []; // List of connected public keys used for filtering and other logic.
    this.connections = []; // List of connected nodes used for IO of data.

    this.server.on("listening", () => this.emit("listening")); // Emit listening event outside of the protocol class.
  }

  /**
   * Handle incoming socket connections and packets.
   *
   * @param {NoiseSecretStream} connection The connected node.
   */
  _handleServerConnection(connection) {
    connection.on("data", (raw) => {
      const packetString = raw.toString();
      const packet = JSON.parse(packetString);

      switch (packet.type) {
        case Constants.HANDSHAKE:
          if (this.connectedPublicKeys.includes(packet.data)) break;

          connection.irisConnectionId = packet.data;

          const socket = this.dht.connect(packet.data);

          this.connectedPublicKeys.push(packet.data);
          this.connections.push(connection);

          socket.write(
            JSON.stringify({
              type: Constants.HANDSHAKE,
              data: this.publicKey.toString("hex"),
            })
          );

          break;
        default:
          break;
      }
    });

    connection.on("end", () => {
      this.connections = this.connections.filter(
        (_connection) =>
          _connection.irisConnectionId !== connection.irisConnectionId
      );
    });
  }

  get publicKey() {
    return this.keyPair.publicKey;
  }

  async listen() {
    await this.server.listen(this.keyPair);
  }

  connect(topicHex) {
    const socket = this.dht.connect(topicHex);

    this.connectedPublicKeys.push(topicHex);
    this.connections.push(socket);

    socket.write(
      JSON.stringify({
        type: Constants.HANDSHAKE,
        data: this.publicKey.toString("hex"),
      })
    );
  }
}
