const { input, password } = require("@inquirer/prompts");
const { IrisProtocolSwarm, IrisProtocolUser, Constants } = require("..");
const figlet = require("figlet");
const gradient = require("gradient-string");
const path = require("path");

(async () => {
  console.log(gradient.passion(figlet.textSync("IrisProtocol")));

  const user = new IrisProtocolUser("connor-davis");

  if (!user.password) {
    let newPassword = await password({
      message: "What is the password for " + user.username + "?",
      theme: {
        prefix: "",
      },
      mask: "*",
    });

    user.setPassword(newPassword);

    user.save();
  }

  let confirmPassword = await password({
    message: "Confirm the password for " + user.username + "?",
    theme: {
      prefix: "",
    },
    mask: "*",
  });

  if (!user.verifyPassword(confirmPassword))
    return console.log("🔥 Failed to verify password.");

  console.log(" Welcome to IrisProtocol! ❤️");

  let sessionName = await input({
    message: "What would you like to make your session name?",
  });

  let server = new IrisProtocolSwarm(sessionName, user);

  console.log(" Initializing...");

  await server.listen();

  console.log(" Running! 🚀");

  server.internal.subscribe((packet) => console.log(packet));

  // const fileId = server.files.addFile(
  //   path.join(process.cwd(), "Uploads", "test.txt")
  // );

  // console.log("File ID: " + fileId);

  // const downloadPublicKey = await server.files.uploadFile(fileId);

  // console.log("Download Public Key: " + downloadPublicKey);
})();
