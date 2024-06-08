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
import IrisProtocol from "./index.js";

const protocol = new IrisProtocol();

protocol.on("listening", () => {
  console.log(protocol.publicKey.toString("hex"));

  protocol.connect(
    "6fcf71d6bdc2f3b6273b1f656c4fb1552d17f14ed415605b95f9b7e3d932efe5"
  );
});

await protocol.listen();
```

### Note

The above examples show how to setup a client and a server instance and connect. However, that does not mean each is a client and a server - they are both. The are able to communicate bi-directionally.
