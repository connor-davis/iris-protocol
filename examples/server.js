import figlet from "figlet";
import gradient from "gradient-string";
import inquirer from "inquirer";
import { basename } from "path";
import { REFRESH_CONSOLE } from "../constants.js";
import { Server } from "../index.js";

const { textSync } = figlet;
const { prompt } = inquirer;
const { pastel, fruit } = gradient;

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
    case REFRESH_CONSOLE:
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

  console.log(pastel.multiline(textSync("IrisProtocol")));

  const { option } = await prompt({
    type: "list",
    name: "option",
    message: "What would you like to do?",
    choices: Object.values(Choices),
  });

  switch (option) {
    case Choices.ADD_FILE:
      const { filePath1 } = await prompt({
        type: "input",
        name: "filePath1",
        message: "Drag the file onto the terminal:",
      });

      const fileName1 = basename(filePath1);

      server.addFile(filePath1, fileName1);

      break;

    case Choices.REMOVE_FILE:
      if (server.files.length > 0) {
        const { fileName2 } = await prompt({
          type: "list",
          name: "fileName2",
          message: "Which file would you like to remove?",
          choices: server.files.map((file) => file.fileName),
        });

        server.removeFile(fileName2);
      }

      break;

    case Choices.GET_PUBLIC_KEY:
      console.log("Public Key: " + fruit(server.publicKey.toString("hex")));

      await prompt({
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

(async () => {
  await app();
})();
