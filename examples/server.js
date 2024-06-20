const { input, password } = require("@inquirer/prompts");
const { User, Network, Constants } = require("..");
const figlet = require("figlet");
const gradient = require("gradient-string");
const path = require("path");

(async () => {
  console.log(gradient.passion(figlet.textSync("IrisProtocol")));

  const user = new User("connor-davis");

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
  console.log(" Starting your users session");

  const session = user.session;

  const network = new Network(session.keyPair, user);

  network.events.subscribe((event) => {
    switch (event.type) {
      case Constants.LISTENING:
        console.log(
          "🚀 Session listening on public key: " +
            session.keyPair.publicKey.toString("hex")
        );

        break;
      default:
        break;
    }
  });

  await network.listen();
})();
