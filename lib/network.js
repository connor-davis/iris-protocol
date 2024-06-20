const { Subject } = require("rxjs");
const Packet = require("./packet");
const HyperDHT = require("hyperdht");
const Constants = require("../constants");
const b4a = require("b4a");

/**
 * The IrisProtocol is used to connect peers with bi-directionaly communication between one another.
 */
class Network {
  /**
   * ### Introduction
   * The IrisProtocol is used to connect peers with bi-directionaly communication between one another.
   *
   * ### Arguments
   * @param {Object} keyPair The topic to join the swarm on.
   * @param {String} keyPair.publicKey The topic to join the swarm on.
   * @param {String} keyPair.secretKey The topic to join the swarm on.
   * @param {User} user The iris protocol user associated to the swarm instance.
   */
  constructor(keyPair = { publicKey: undefined, secretKey: undefined }, user) {
    if (keyPair && keyPair.publicKey && keyPair.secretKey) {
      this.keyPair = {
        publicKey: b4a.from(keyPair.publicKey, "hex"),
        secretKey: b4a.from(keyPair.secretKey, "hex"),
      };
    }

    this.user = user;

    this.events = new Subject();
    this.in = new Subject();
    this.out = new Subject();
  }

  emit(type, data = {}) {
    this.out.next({ type, data });
  }

  on(type, callback = (data) => {}) {
    this.in.subscribe((packet) => {
      if (packet.type === type) return callback(packet.data);
    });
  }

  async listen() {
    if (!this.keyPair) return new Error("Please provide the Network's keyPair");

    this.hyperDHT = new HyperDHT();
    this.hyperServer = this.hyperDHT.createServer((socket) => {
      socket.write(
        Packet.create(Constants.NETWORK_INFORMATION, {
          metadata: {
            username: this.user.username,
          },
        })
      );

      socket.on("data", (rawPacket) => this.in.next(Packet.read(rawPacket)));

      socket.on("error", () => {});
      socket.on("close", () => {});

      this.out.subscribe((packet) =>
        socket.write(Packet.create(packet.type, packet.data))
      );
    });

    this.hyperServer.on("listening", () =>
      this.events.next({ type: Constants.LISTENING })
    );

    await this.hyperServer.listen(this.keyPair);
  }

  connect(publicKey) {
    this.hyperDHT = new HyperDHT();
    this.hyperSocket = this.hyperDHT.connect(publicKey);

    this.hyperSocket.on("open", () => {
      this.events.next({ type: Constants.LISTENING });

      this.hyperSocket.on("data", (rawPacket) =>
        this.in.next(Packet.read(rawPacket))
      );

      this.hyperSocket.on("error", () => {});
      this.hyperSocket.on("close", () => {});

      this.out.subscribe((packet) =>
        this.hyperSocket.write(Packet.create(packet.type, packet.data))
      );
    });
  }

  async close() {
    await this.hyperDHT.destroy();
  }
}

module.exports = Network;
