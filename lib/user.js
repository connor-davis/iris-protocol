const { hashSync, compareSync, genSaltSync } = require("bcrypt");
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const HyperDHT = require("hyperdht");
const path = require("path");

class User {
  constructor(username) {
    this.username = username;

    const tempKeyPair = HyperDHT.keyPair();

    this.keyPair = {
      publicKey: tempKeyPair.publicKey.toString("hex"),
      secretKey: tempKeyPair.secretKey.toString("hex"),
    };
    this.password = undefined;
    this.preferences = {};
    this.sessions = {};
    this.session = {
      sessionName: this.username,
    };
    this.blockedUsernames = [];

    this.read();

    if (!existsSync(path.join(process.cwd(), "users")))
      mkdirSync(path.join(process.cwd(), "users"));
  }

  save() {
    const userJson = {
      username: this.username,
      keyPair: this.keyPair,
      password: this.password,
      preferences: this.preferences,
      sessions: this.sessions,
      session: this.session,
    };
    const userFile = JSON.stringify(userJson);

    writeFileSync(
      path.join(process.cwd(), "users", `${this.username}.json`),
      userFile,
      { encoding: "utf-8" }
    );
  }

  read() {
    if (
      existsSync(path.join(process.cwd(), "users", `${this.username}.json`))
    ) {
      const userFile = readFileSync(
        path.join(process.cwd(), "users", `${this.username}.json`),
        { encoding: "utf-8" }
      );
      const userJson = JSON.parse(userFile);

      this.username = userJson.username || this.username;
      this.keyPair = userJson.keyPair || this.keyPair;
      this.password = userJson.password || undefined;
      this.preferences = userJson.preferences || {};
      this.sessions = userJson.sessions || {};
      this.session = userJson.session || {
        sessionName: this.username,
        keyPair: this.keyPair,
      };
    } else {
      this.password = undefined;
      this.preferences = {};
      this.sessions = {};
      this.session = {
        sessionName: this.username,
        keyPair: this.keyPair,
      };
    }
  }

  setUsername(username) {
    this.username = username;
    this.save();
  }

  getUsername() {
    return this.username;
  }

  setPassword(password) {
    const passwordSalt = genSaltSync(1024);
    const passwordHash = hashSync(password, passwordSalt);

    this.password = passwordHash;
  }

  verifyPassword(password) {
    return compareSync(password, this.password);
  }

  setPreference(key, value) {
    this.preferences[key] = value;
    this.save();
  }

  getPreference(key) {
    return this.preferences[key];
  }

  saveSession(sessionName, sessionData = {}) {
    this.sessions[sessionName] = {
      ...sessionData,
    };
    this.save();
  }

  getSession(sessionName) {
    return this.sessions[sessionName];
  }

  removeSession(sessionName) {
    delete this.sessions[sessionName];
    this.save();
  }

  addBlockedUsername(username) {
    this.blockedUsernames = [...new Set([...this.blockedUsernames, username])];
    this.save();
  }

  removeBlockedUsername(username) {
    this.blockedUsernames = this.blockedUsernames.filter(
      (_username) => _username !== username
    );
    this.save();
  }
}

module.exports = User;
