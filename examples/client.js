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
