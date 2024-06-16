import figlet from "figlet";
import gradient from "gradient-string";
import inquirer from "inquirer";
import IrisProtocol from "../index.mjs";

const { LISTENING } = Constants;
const { IrisProtocolClient, Constants } = IrisProtocol;
const { textSync } = figlet;
const { prompt } = inquirer;
const { pastel } = gradient;

const Choices = {
  DOWNLOAD_FILE: "Download File",
  EXIT: "Exit",
};

const { publicKey } = await prompt({
  type: "input",
  name: "publicKey",
  message: "What is the host's public key?",
});

const client = new IrisProtocolClient(publicKey);

client.events.subscribe((rawPacket) => {
  const packetString = rawPacket.toString();
  const packet = JSON.parse(packetString);

  switch (packet.type) {
    case LISTENING:
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

  console.log(pastel.multiline(textSync("IrisProtocol")));

  const { option } = await prompt({
    type: "list",
    name: "option",
    message: "What would you like to do?",
    choices: Object.values(Choices),
  });

  switch (option) {
    case Choices.DOWNLOAD_FILE:
      const files = await client.getRemoteFiles();

      if (files.length > 0) {
        const { fileName } = await prompt({
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
