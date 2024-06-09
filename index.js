import { EventEmitter } from "events";
import DHT from "hyperdht";
import Constants from "./constants.js";

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
    connection.on("data", (rawPacket) => {
      const packetString = rawPacket.toString();
      const packet = JSON.parse(packetString);

      this.handlePacket(packet, connection);
    });
  }

  handlePacket(packet, connection, isServerPacket = true) {
    if (isServerPacket) {
      console.log("server:");
    } else {
      console.log("client:");
    }

    console.log(packet);

    switch (packet.type) {
      case Constants.HANDSHAKE:
        this.emit("connection");

        console.log(`New Connection: ${packet.data}`);

        if (this.connectedPublicKeys.includes(packet.data)) break; // Prevent reconnecting to a node if a connection has already been made.

        connection.irisConnectionId = packet.data;

        this.connect(packet.data);

        break;

      case Constants.BROADCAST:
        const broadcastPacket = packet.data;

        this.handlePacket(broadcastPacket, connection, isServerPacket);

        this.connections
          .filter(
            (_connection) =>
              _connection.irisConnectionId !== connection.irisConnectionId
          )
          .forEach((connection) =>
            connection.write(JSON.stringify(broadcastPacket))
          );

        break;

      case Constants.MESSAGE:
        this.emit(Constants.MESSAGE, packet.data);

        break;

      case Constants.WAVE:
        this.connections = this.connections.filter(
          (_connection) =>
            _connection.irisConnectionId !== connection.irisConnectionId
        );
        this.connectedPublicKeys = this.connectedPublicKeys.filter(
          (irisConnectionId) => irisConnectionId !== connection.irisConnectionId
        );

        connection.write(JSON.stringify({ type: Constants.WAVE }));
        connection.end();

        break;

      default:
        break;
    }

    connection.on("end", () => {
      console.log(`End Connection: ${connection.irisConnectionId}`);
    });
  }

  get publicKey() {
    return this.keyPair.publicKey;
  }

  /**
   * This functions receives a packet and broadcasts it to all connections.
   *
   * @param {Object} packet This packet will be sent to all connections who will then send to it to their connections as well as receive the same packet for itself.
   */
  broadcast(packet) {
    this.connections.forEach((connection) =>
      connection.write(
        JSON.stringify({ type: Constants.BROADCAST, data: packet })
      )
    );
  }

  async listen() {
    await this.server.listen(this.keyPair);
  }

  connect(topicHex) {
    const socket = this.dht.connect(topicHex);

    socket.irisConnectionId = topicHex;

    this.connectedPublicKeys.push(topicHex);
    this.connections.push(socket);

    socket.write(
      JSON.stringify({
        type: Constants.HANDSHAKE,
        data: this.publicKey.toString("hex"),
      })
    );

    socket.on("data", (rawPacket) => {
      const packetString = rawPacket.toString();
      const packet = JSON.parse(packetString);

      this.handlePacket(packet, socket, false);
    });
  }

  end() {
    this.connections.forEach((connection) => {
      connection.write(
        JSON.stringify({
          type: Constants.WAVE,
        })
      );
    });
  }
}
