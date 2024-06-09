# Iris Protocol

Welcome to the IrisProtocol, attempting to make P2P communication better thanks to [HyperCore Protocol](https://holepunch.to) and more.

### Example Server

```js
import IrisProtocol from "./index.js";

const protocol = new IrisProtocol();

protocol.on("listening", () => {
  console.log(protocol.publicKey.toString("hex"));
});

await protocol.listen();
```

### Example Client
```js
import Constants from "./constants.js";
import IrisProtocol from "./index.js";

const protocol = new IrisProtocol();

protocol.on("listening", async () => {
  console.log(protocol.publicKey.toString("hex"));

  protocol.connect(
    "328cd0a22bd92c59cf9d226968f5b027a553f3df22c34aab2b2c7cbc59de80e9"
  );

  protocol.on("connection", () =>
    protocol.broadcast({
      type: Constants.MESSAGE,
      data: { text: "Hello World!" },
    })
  );
});

await protocol.listen();
```

### Note

The above examples show how to setup a client and a server instance and connect. However, that does not mean each is a client and a server - they are both. The are able to communicate bi-directionally.
