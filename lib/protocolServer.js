const net = require("net");
const HyperDHT = require("hyperdht");
const { Subject } = require("rxjs");
const { WebSocketServer } = require("ws");
const Constants = require("../constants");
const { existsSync, statSync, createReadStream } = require("fs");
const progress = require("progress-stream");
const pump = require("pump");

/**
 * The IrisProtocol is used to connect peers with bi-directionaly communication between one another.
 */
class IrisProtocolServer {
  /**
   * ### Introduction
   * The IrisProtocol is used to connect peers with bi-directionaly communication between one another.
   *
   * ### Arguments
   * @param {Object} options The IrisProtocol class options object.
   * @param {DHT.keyPair} options.keyPair The HyperDHT keyPair that you would like to assign to the protocol instance. Or you can leave it and use the default.
   * @param {DHT} options.dht The HyperDHT instance that you would like to assign to the protocol instance. Or you can leave it and use the default.
   */
  constructor(
    options = { keyPair: undefined, dht: undefined, isConsole: undefined }
  ) {
    this.keyPair = options.keyPair || HyperDHT.keyPair();
    this.dht = options.dht || new HyperDHT({});
    this.isConsole = options.isConsole || true;

    this.clients = [];
    this.files = [];

    this.events = new Subject();
    this.in = new Subject();
    this.out = new Subject();

    this.hyperServer = this.dht.createServer();

    this.hyperServer.on("listening", () => {
      this.hyperServer.on("connection", (socket) => {
        socket.on("error", console.log);

        socket.on("data", (rawPacket) => this.in.next(rawPacket));

        this.out.subscribe((rawPacket) => socket.write(rawPacket));
      });

      this.events.next(JSON.stringify({ type: Constants.LISTENING }));
    });

    this.in.subscribe((rawPacket) => {
      const packetString = rawPacket.toString();
      const packet = JSON.parse(packetString);

      switch (packet.type) {
        case Constants.DOWNLOAD_FILE_REQUEST:
          const fileName = packet.fileName;
          const files = this.files.filter((file) => file.fileName === fileName);

          if (files.length >= 1) {
            const filePath = files[0].filePath;
            const fileStat = statSync(filePath);

            if (existsSync(filePath)) {
              (async () => {
                const publicKey = await this.uploadFile(filePath, (progress) =>
                  this.events.next(
                    JSON.stringify({ type: Constants.PROGRESS, progress })
                  )
                );

                this.out.next(
                  JSON.stringify({
                    type: Constants.DOWNLOAD_FILE_ACCEPTED,
                    fsPublicKey: publicKey.toString("hex"),
                    fileSize: fileStat.size,
                  })
                );
              })();
            }
          }

          break;

        case Constants.FILE_LIST_REQUEST:
          this.out.next(
            JSON.stringify({
              type: Constants.FILE_LIST_ACCEPTED,
              files: this.files,
            })
          );

          break;

        default:
          break;
      }
    });

    (async () => {
      await this.hyperServer.listen(this.keyPair);
    })();
  }

  get publicKey() {
    return this.keyPair.publicKey;
  }

  addFile(filePath, fileName) {
    this.files.push({ filePath, fileName });

    this.out.next(
      JSON.stringify({ type: Constants.FILE_LIST_ACCEPTED, files: this.files })
    );
  }

  removeFile(fileName) {
    this.files = this.files.filter((file) => file.fileName !== fileName);

    this.out.next(
      JSON.stringify({ type: Constants.FILE_LIST_ACCEPTED, files: this.files })
    );
  }

  sendMessage(content) {
    this.out.next(
      JSON.stringify({
        type: Constants.MESSAGE,
        content,
        publicKey: this.publicKey.toString("hex"),
      })
    );
  }

  async uploadFile(filePath) {
    const fsKeyPair = DHT.keyPair();
    const fsServer = this.dht.createServer();
    const fileStat = statSync(filePath);

    const transferProgress = progress({
      length: fileStat.size,
      time: 100 /* ms */,
    });

    transferProgress.on("progress", (progress) => {
      this.events.next(
        JSON.stringify({ type: Constants.PROGRESS, filePath, progress })
      );
    });

    fsServer.on("connection", (socket) => {
      createReadStream(filePath).pipe(transferProgress).pipe(socket);
    });

    await fsServer.listen(fsKeyPair);

    return fsKeyPair.publicKey;
  }
}

module.exports = IrisProtocolServer;
