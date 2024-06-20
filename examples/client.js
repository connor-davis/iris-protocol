const { input, password } = require("@inquirer/prompts");
const { Network, User, Constants } = require("..");
const figlet = require("figlet");
const gradient = require("gradient-string");

(async () => {
  console.log(gradient.passion(figlet.textSync("IrisProtocol")));

  const user = new User("connor-test");

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

  const publicKey = await input({
    message: "What is the sessions public key?",
  });

  console.log(" Joining session with public key: " + publicKey);

  const network = new Network();

  network.connect(publicKey);

  network.events.subscribe((event) => {
    switch (event.type) {
      case Constants.LISTENING:
        console.log(" Joined session with public key: " + publicKey);

        break;
      default:
        break;
    }
  });

  network.in.subscribe((packet) => {
    switch (packet.type) {
      case Constants.NETWORK_INFORMATION:
        const data = packet.data;

        user.saveSession(data.metadata.username, { publicKey });

        break;
      default:
        break;
    }
  });
})();
