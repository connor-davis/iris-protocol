const { IrisProtocolServer } = require("..");
const inquirer = require("inquirer");
const gradient = require("gradient-string");
const figlet = require("figlet");
const { REFRESH_CONSOLE } = require("../constants");
const path = require("path");

const server = new IrisProtocolServer();

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

(async () => {
  await app();
})();
