const { v4 } = require("uuid");
const {
  existsSync,
  statSync,
  createReadStream,
  createWriteStream,
  mkdirSync,
} = require("fs");
const progressStream = require("progress-stream");
const { Subject } = require("rxjs");
const { basename } = require("path");
const path = require("path");
const HyperDHT = require("hyperdht");
const IrisProtocolPacket = require("./packet");
const Constants = require("../constants");

class Files {
  constructor() {
    this.files = [];
    this.events = new Subject();
  }

  addFile(filePath) {
    const fileId = v4();
    const fileExists = existsSync(filePath);

    if (!fileExists) return undefined;

    const fileName = basename(filePath);
    const fileSize = statSync(filePath).size;

    this.files = [
      ...this.files.filter((file) => file.filePath !== filePath),
      {
        fileId,
        fileName,
        filePath,
        fileSize,
      },
    ];

    return fileId;
  }

  removeFile(fileId) {
    this.files = this.files.filter((file) => file.fileId !== fileId);
  }

  async uploadFile(fileId) {
    return new Promise((resolve, reject) => {
      const file = this.files.filter((file) => file.fileId === fileId)[0];

      if (!file) return undefined;

      const uploadKeyPair = HyperDHT.keyPair();
      const uploadDht = new HyperDHT();

      const uploadDhtServer = uploadDht.createServer((uploadSocket) => {
        uploadSocket.write(
          IrisProtocolPacket.create(Constants.FILE_INFORMATION, file)
        );

        uploadSocket.on("data", (rawPacket) => {
          const packet = IrisProtocolPacket.read(rawPacket);

          switch (packet.type) {
            case Constants.READY_FOR_DOWNLOAD:
              const fileKeyPair = HyperDHT.keyPair();
              const fileDht = new HyperDHT();
              const fileDhtServer = fileDht.createServer((fileSocket) => {
                const transferProgress = progressStream({
                  length: file.fileSize,
                  time: 100,
                });

                transferProgress.on("progress", (progress) =>
                  this.events.next({
                    type: Constants.PROGRESS,
                    fileId,
                    publicKey: fileKeyPair.publicKey.toString("hex"),
                    progress,
                  })
                );

                createReadStream(file.filePath)
                  .pipe(transferProgress)
                  .pipe(fileSocket);
              });

              fileDhtServer.on("listening", () => {
                this.events.next({
                  type: Constants.READY_FOR_UPLOAD,
                  fileId,
                  publicKey: fileKeyPair.publicKey.toString("hex"),
                });

                uploadSocket.write(
                  IrisProtocolPacket.create(Constants.READY_FOR_UPLOAD, {
                    filePublicKey: fileKeyPair.publicKey.toString("hex"),
                  })
                );
              });

              (async () => {
                await fileDhtServer.listen(fileKeyPair);
              })();

              break;
            default:
              break;
          }
        });
      });

      uploadDhtServer.on("listening", () => {
        resolve(uploadKeyPair.publicKey.toString("hex"));
      });

      (async () => {
        await uploadDhtServer.listen(uploadKeyPair);
      })();
    });
  }

  async downloadFile(
    publicKey,
    downloadsDirectory = path.join(process.cwd(), "Downloads")
  ) {
    return new Promise((resolve, reject) => {
      const downloadDht = new HyperDHT();
      const downloadSocket = downloadDht.connect(publicKey);

      let fileInformation;
      let downloadPath;
      let transferProgress;

      downloadSocket.on("open", () => {
        downloadSocket.on("data", (rawPacket) => {
          const packet = IrisProtocolPacket.read(rawPacket);

          switch (packet.type) {
            case Constants.FILE_INFORMATION:
              fileInformation = packet.data;

              if (!existsSync(downloadsDirectory))
                mkdirSync(downloadsDirectory);

              downloadPath = path.join(
                downloadsDirectory,
                fileInformation.fileName
              );

              transferProgress = new progressStream({
                length: fileInformation.fileSize,
                time: 100,
              });

              this.events.next({
                type: Constants.READY_FOR_DOWNLOAD,
                fileId: fileInformation.fileId,
                publicKey,
              });

              downloadSocket.write(
                IrisProtocolPacket.create(Constants.READY_FOR_DOWNLOAD)
              );

              break;
            case Constants.READY_FOR_UPLOAD:
              const filePublicKey = packet.data.filePublicKey;

              const fileDht = new HyperDHT();
              const fileSocket = fileDht.connect(filePublicKey);

              transferProgress.on("progress", (progress) =>
                this.events.next({
                  type: Constants.PROGRESS,
                  fileId: fileInformation.fileId,
                  publicKey,
                  progress,
                })
              );

              fileSocket.on("open", () => {
                fileSocket
                  .pipe(transferProgress)
                  .pipe(createWriteStream(downloadPath));
              });

              fileSocket.on("close", async () => {
                await downloadSocket.close();
                resolve();
              });

              break;
            default:
              break;
          }
        });
      });
    });
  }
}

module.exports = Files;
