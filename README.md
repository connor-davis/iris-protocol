# Iris Protocol

Welcome to the IrisProtocol, attempting to make P2P communication better thanks to [HyperCore Protocol](https://holepunch.to) and more.

### Install

```bash
npm i iris-protocol@latest
```

### Example Server

```js
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
```

### Example Client

```js
const { input, password } = require("@inquirer/prompts");
const { IrisProtocolSwarm, IrisProtocolUser, Constants } = require("..");
const figlet = require("figlet");
const gradient = require("gradient-string");

(async () => {
  console.log(gradient.passion(figlet.textSync("IrisProtocol")));

  const user = new IrisProtocolUser("connor-test");

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

  let server = new IrisProtocolSwarm(sessionName, user, false);

  console.log(" Initializing...");

  await server.listen();

  console.log(" Running! 🚀");

  server.internal.subscribe((packet) => console.log(packet));

  // server.files.downloadFile(
  //   "3facee3f0ac2b9037b309bcf1016df0377a33cc0786c1d813362c7563aeb7728"
  // );
})();
```
