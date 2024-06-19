const Hyperswarm = require("hyperswarm");
const { Subject } = require("rxjs");
const Constants = require("../constants");
const IrisProtocolUser = require("./user");
const IrisProtocolPacket = require("./packet");
const IrisProtocolFiles = require("./files");

/**
 * The IrisProtocol is used to connect peers with bi-directionaly communication between one another.
 */
class IrisProtocolSwarm {
  /**
   * ### Introduction
   * The IrisProtocol is used to connect peers with bi-directionaly communication between one another.
   *
   * ### Arguments
   * @param {String} topic The topic to join the swarm on.
   * @param {IrisProtocolUser} user The iris protocol user associated to the swarm instance.
   * @param {boolean} isServer Whether or not this is the server node or not. Default: ```true```
   * @param {Object} options The IrisProtocol class options object.
   * @param {DHT.keyPair} options.keyPair The HyperDHT keyPair that you would like to assign to the protocol instance. Or you can leave it and use the default.
   * @param {DHT} options.dht The HyperDHT instance that you would like to assign to the protocol instance. Or you can leave it and use the default.
   * @param {number} options.pingInterval The amount of time in milliseconds to ping peers.
   */
  constructor(
    topic,
    user,
    isServer = true,
    options = { pingInterval: undefined }
  ) {
    this.pingInterval = options.pingInterval || 5000;
    this.isServer = isServer;
    this.files = new IrisProtocolFiles();
    this.files.events.subscribe((packet) =>
      this.internal.next({ type: Constants.FILE, data: packet })
    );

    this.topic = topic;
    this.connections = [];

    if (!this.topic)
      return new Error("IrisProtocol requires a topic to be set.");

    this.topicBuffer = Buffer.alloc(32).fill(this.topic);
    this.user = user;

    if (!this.user) return new Error("IrisProtocol requires a user to be set.");

    this.swarm = new Hyperswarm();
    this.swarmDiscovery = this.swarm.join(this.topicBuffer, {
      server: isServer,
      client: !isServer,
    });

    this.errors = new Subject();
    this.internal = new Subject();
    this.externalOut = new Subject();
    this.externalIn = new Subject();

    this.swarm.on("connection", (socket) => {
      let socketUsername;

      if (!isServer) {
        let handshake = IrisProtocolPacket.create(Constants.HANDSHAKE, {
          username: this.user.username,
        });

        socket.write(handshake);
      }

      this.externalOut.subscribe((packet) => {
        const rawPacket = IrisProtocolPacket.create(packet.type, packet.data);

        socket.write(rawPacket);
      });

      socket.on("data", (rawPacket) => {
        const packet = IrisProtocolPacket.read(rawPacket);

        switch (packet.type) {
          case Constants.HANDSHAKE:
            const { username } = packet.data;

            if (!username) {
              socket.end();
              return;
            }

            if (this.user.blockedUsernames.includes(username)) {
              socket.end();
              return;
            }

            this.swarm.joinPeer(socket.remotePublicKey);

            socketUsername = username;

            this.internal.next({ type: Constants.PEER_CONNECTED, username });

            if (this.isServer) {
              this.externalOut.next({
                type: Constants.HANDSHAKE,
                data: { username: this.user.username },
              });
            }

            break;
          case Constants.REQUEST_FILES:
            socket.write(
              IrisProtocolPacket.create(Constants.RESPONSE_FILES, {
                files: this.files.files,
              })
            );

            break;
          default:
            this.externalIn.next(packet);
            break;
        }
      });

      socket.on("error", () => {});

      socket.on("close", () => {
        this.internal.next({
          type: Constants.PEER_DISCONNECTED,
          username: socketUsername,
        });
      });
    });

    this.externalIn.subscribe((packet) => {
      this.handlePacket(packet);
    });
  }

  sendMessage(message) {
    this.externalOut.next(
      IrisProtocolPacket.create(Constants.MESSAGE, {
        message,
        username: this.user.username,
      })
    );
  }

  handlePacket(packet) {
    switch (packet.type) {
      case Constants.RESPONSE_FILES:
        this.internal.next(packet);
        break;
      default:
        break;
    }
  }

  async listen() {
    await this.swarmDiscovery.flushed();

    this.internal.next(JSON.stringify({ type: Constants.LISTENING }));
  }

  async close() {
    await this.swarmDiscovery.destroy();
    await this.swarm.destroy();
  }
}

module.exports = IrisProtocolSwarm;
