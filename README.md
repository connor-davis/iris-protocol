# Iris Protocol

Welcome to the IrisProtocol, attempting to make P2P communication better thanks to [HyperCore Protocol](https://holepunch.to) and more.

### Install

```bash
npm i iris-protocol@latest
```

### Example Server

```js
import Constants from "../constants.js";
import { Server } from "../index.js";
import figlet from "figlet";
import inquirer from "inquirer";
import gradient from "gradient-string";
import path from "path";

const server = new Server();

const Choices = {
  ADD_FILE: "Add File",
  REMOVE_FILE: "Remove File",
  GET_PUBLIC_KEY: "Get Public Key",
  EXIT: "Exit",
};

server.events.subscribe((rawPacket) => {
  const packetString = rawPacket.toString();
  const packet = JSON.parse(packetString);

  switch (packet.type) {
    case Constants.REFRESH_CONSOLE:
      (async () => {
        await app();
      })();

      break;
    default:
      break;
  }
});

const app = async () => {
  process.stdout.write("\x1Bc");

  console.log(gradient.pastel.multiline(figlet.textSync("IrisProtocol")));

  const { option } = await inquirer.prompt({
    type: "list",
    name: "option",
    message: "What would you like to do?",
    choices: Object.values(Choices),
  });

  switch (option) {
    case Choices.ADD_FILE:
      const { filePath1 } = await inquirer.prompt({
        type: "input",
        name: "filePath1",
        message: "Drag the file onto the terminal:",
      });

      const fileName1 = path.basename(filePath1);

      server.addFile(filePath1, fileName1);

      break;

    case Choices.REMOVE_FILE:
      if (server.files.length > 0) {
        const { fileName2 } = await inquirer.prompt({
          type: "list",
          name: "fileName2",
          message: "Which file would you like to remove?",
          choices: server.files.map((file) => file.fileName),
        });

        server.removeFile(fileName2);
      }

      break;

    case Choices.GET_PUBLIC_KEY:
      console.log(
        "Public Key: " + gradient.fruit(server.publicKey.toString("hex"))
      );

      await inquirer.prompt({
        type: "confirm",
        name: "option",
        message: "Have you copied your public key?",
      });

      break;

    case Choices.EXIT:
      process.exit(1);

    default:
      break;
  }

  await app();
};

await app();
```

### Example Client

```js
import inquirer from "inquirer";
import Constants from "../constants.js";
import { Client } from "../index.js";
import gradient from "gradient-string";
import figlet from "figlet";

const Choices = {
  DOWNLOAD_FILE: "Download File",
  EXIT: "Exit",
};

const { publicKey } = await inquirer.prompt({
  type: "input",
  name: "publicKey",
  message: "What is the host's public key?",
});

const client = new Client(publicKey);

client.events.subscribe((rawPacket) => {
  const packetString = rawPacket.toString();
  const packet = JSON.parse(packetString);

  switch (packet.type) {
    case Constants.LISTENING:
      client.socket.on("open", () => {
        (async () => {
          await app();
        })();
      });
      break;
    default:
      break;
  }
});

const app = async () => {
  process.stdout.write("\x1Bc");

  console.log(gradient.pastel.multiline(figlet.textSync("IrisProtocol")));

  const { option } = await inquirer.prompt({
    type: "list",
    name: "option",
    message: "What would you like to do?",
    choices: Object.values(Choices),
  });

  switch (option) {
    case Choices.DOWNLOAD_FILE:
      const files = await client.getRemoteFiles();

      if (files.length > 0) {
        const { fileName } = await inquirer.prompt({
          type: "list",
          name: "fileName",
          message: "Which file do you want to download?",
          choices: files.map((file) => file.fileName),
        });

        await client.downloadFile(fileName, console.log);
      }

      break;

    case Choices.EXIT:
      process.exit(1);

    default:
      break;
  }

  await app();
};
```
