# Iris Protocol

Welcome to the IrisProtocol, attempting to make P2P communication better thanks to [HyperCore Protocol](https://holepunch.to) and more.

### Example Server

```js
import Constants from "../constants.js";
import { Server } from "../index.js";

const server = new Server();

server.events.subscribe((rawPacket) => {
  const packetString = rawPacket.toString();
  const packet = JSON.parse(packetString);

  switch (packet.type) {
    case Constants.HANDSHAKE:
      console.log(packet);
      break;

    case Constants.LISTENING:
      console.log(server.publicKey.toString("hex"));
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
  "85c6cde9aa65e64cb6714c2fb8aa5c43cf426e1c461ab684fe6d44b0a3cdf7ec"
);

client.events.subscribe((rawPacket) => {
  const packetString = rawPacket.toString();
  const packet = JSON.parse(packetString);

  switch (packet.type) {
    case Constants.LISTENING:
      console.log(client.publicKey.toString("hex"));

      client.socket.on("open", () => {
        client.socket.send(JSON.stringify({ type: Constants.HANDSHAKE }));
      });

      break;

    default:
      break;
  }
});
```

### Note

The above examples show how to setup a client and a server instance and connect. However, that does not mean each is a client and a server - they are both. The are able to communicate bi-directionally.
