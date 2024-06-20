# Iris Protocol

Welcome to the IrisProtocol, attempting to make P2P communication better thanks to [HyperCore Protocol](https://holepunch.to) and more.

### Install

```bash
npm i iris-protocol@latest
```

### Example Server

```js
const { password } = require("@inquirer/prompts");
const { User, Network, Constants } = require("..");
const figlet = require("figlet");
const gradient = require("gradient-string");

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
```

### Example Client

```js
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
```
