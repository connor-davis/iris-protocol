const net = require("net");
const HyperDHT = require("hyperdht");
const { Subject } = require("rxjs");
const { WebSocket } = require("ws");
const Constants = require("../constants");
const { existsSync, mkdirSync, createWriteStream } = require("fs");
const path = require("path");
const progress = require("progress-stream");
const pump = require("pump");

/**
 * The IrisProtocol is used to connect peers with bi-directionaly communication between one another. This will change to offer more in the future.
 */
class IrisProtocolClient {
  /**
   * ### Introduction
   * The IrisProtocol is used to connect peers with bi-directionaly communication between one another. This will change to offer more in the future.
   *
   * ### Arguments
   * @param {Object} options The IrisProtocol class options object.
   * @param {DHT.keyPair} options.keyPair The HyperDHT keyPair that you would like to assign to the protocol instance. Or you can leave it and use the default.
   * @param {DHT} options.dht The HyperDHT instance that you would like to assign to the protocol instance. Or you can leave it and use the default.
   */
  constructor(
    topicHex,
    options = { keyPair: undefined, dht: undefined, isConsole: undefined }
  ) {
    if (!topicHex)
      return new Error("IrisProtocolClient needs to have a topicHex");

    this.keyPair = options.keyPair || HyperDHT.keyPair();
    this.dht = options.dht || new HyperDHT({});
    this.isConsole = options.isConsole || false;

    this.events = new Subject();
    this.in = new Subject();
    this.out = new Subject();

    this.wsServer = net.createServer((wssBridge) => {
      const socket = this.dht.connect(topicHex);

      socket.on("open", () => {
        pump(wssBridge, socket, wssBridge);
      });
    });

    this.wsServer.listen(options.port || 0, "0.0.0.0", () => {
      this.socketAddress =
        "ws://" +
        this.wsServer.address().address +
        ":" +
        this.wsServer.address().port;

      this.socket = new WebSocket(this.socketAddress);
      this.socket.on("error", console.log);
      this.socket.on("open", () => {
        this.socket.on("message", (rawPacket, _) => {
          this.in.next(rawPacket);
        });

        this.out.subscribe((rawPacket) => this.socket.send(rawPacket));

        this.events.next(JSON.stringify({ type: Constants.LISTENING }));
      });
    });
  }

  get publicKey() {
    return this.keyPair.publicKey;
  }

  async getRemoteFiles() {
    this.out.next(JSON.stringify({ type: Constants.FILE_LIST_REQUEST }));

    return new Promise((resolve, reject) => {
      this.in.subscribe((rawPacket) => {
        const packetString = rawPacket.toString();
        const packet = JSON.parse(packetString);

        switch (packet.type) {
          case Constants.FILE_LIST_ACCEPTED:
            resolve(packet.files);
            break;
          default:
            break;
        }
      });
    });
  }

  sendMessage(content) {
    this.out.next(JSON.stringify({ type: Constants.MESSAGE, content }));
  }

  async downloadFile(fileName) {
    return new Promise((resolve, reject) => {
      if (!existsSync(path.join(process.cwd(), "Downloads")))
        mkdirSync(path.join(process.cwd(), "Downloads"));

      const filePath = path.join(process.cwd(), "Downloads", fileName);

      this.out.next(
        JSON.stringify({ type: Constants.DOWNLOAD_FILE_REQUEST, fileName })
      );

      this.in.subscribe((rawPacket) => {
        const packetString = rawPacket.toString();
        const packet = JSON.parse(packetString);

        switch (packet.type) {
          case Constants.DOWNLOAD_FILE_ACCEPTED:
            const fsPublicKey = packet.fsPublicKey;
            const fileSize = packet.fileSize;
            const socket = this.dht.connect(fsPublicKey);

            const transferProgress = progress({
              length: fileSize,
              time: 100 /* ms */,
            });

            transferProgress.on("progress", (progress) => {
              this.events.next(
                JSON.stringify({ type: Constants.PROGRESS, filePath, progress })
              );

              if (progress.percentage === 100) resolve();
            });

            socket.on("open", () => {
              socket.pipe(transferProgress).pipe(createWriteStream(filePath));
            });

            break;

          default:
            break;
        }
      });
    });
  }
}

module.exports = IrisProtocolClient;