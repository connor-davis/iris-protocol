# Iris Protocol

Welcome to the IrisProtocol, attempting to make P2P communication better thanks to [HyperCore Protocol](https://holepunch.to) and more.

### Example Server

```js
import { existsSync, readFileSync, statSync, statfsSync } from "fs";
import path from "path";
import Constants from "../constants.js";
import { Server } from "../index.js";

const server = new Server();

server.events.subscribe((rawPacket) => {
  const packetString = rawPacket.toString();
  const packet = JSON.parse(packetString);

  console.log("EVENT: " + packetString);

  switch (packet.type) {
    case Constants.LISTENING:
      console.log(server.publicKey.toString("hex"));
      break;

    default:
      break;
  }
});

server.in.subscribe((rawPacket) => {
  const packetString = rawPacket.toString();
  const packet = JSON.parse(packetString);

  console.log("IN: " + packetString);

  switch (packet.type) {
    case Constants.DOWNLOAD_FILE_REQUEST:
      const fileName = packet.fileName;
      const filePath = path.join(process.cwd(), "uploads", fileName);
      const fileStat = statSync(filePath);

      if (existsSync(filePath)) {
        (async () => {
          const publicKey = await server.createFileReadTunnel(filePath);

          server.out.next(
            JSON.stringify({
              type: Constants.DOWNLOAD_FILE_ACCEPTED,
              fsPublicKey: publicKey.toString("hex"),
              fileSize: fileStat.size,
            })
          );
        })();
      }

      break;

    default:
      break;
  }
});
```

### Example Client

```js
import Constants from "../constants.js";
import { Client } from "../index.js";

const client = new Client(
  "79dc399bacaa1611418e119e457476f36afbb37aaa3ad51c314a268a88b629be"
);

client.events.subscribe((rawPacket) => {
  const packetString = rawPacket.toString();
  const packet = JSON.parse(packetString);

  console.log("EVENT: " + packetString);

  switch (packet.type) {
    case Constants.LISTENING:
      console.log(client.publicKey.toString("hex"));

      client.socket.on("open", () => {
        client.requestFileDownload(
          "Call of Duty  Modern Warfare 3 (2023) 2024.06.14 - 12.34.49.05.DVR.mp4"
        );
      });

      break;

    default:
      break;
  }
});
```

### Note

The above examples show how to setup a client and a server instance and connect. However, that does not mean each is a client and a server - they are both. The are able to communicate bi-directionally.
