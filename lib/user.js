const { hashSync, compareSync, genSaltSync } = require("bcrypt");
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const path = require("path");

class IrisProtocolUser {
  constructor(username) {
    this.username = username;
    this.password = undefined;
    this.preferences = {};
    this.sessions = {};
    this.blockedUsernames = [];

    this.read();

    if (!existsSync(path.join(process.cwd(), "users")))
      mkdirSync(path.join(process.cwd(), "users"));
  }

  save() {
    const userJson = {
      username: this.username,
      password: this.password,
      preferences: this.preferences,
      sessions: this.sessions,
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
      this.password = userJson.password || undefined;
      this.preferences = userJson.preferences || {};
      this.sessions = userJson.sessions || {};
    } else {
      this.password = undefined;
      this.preferences = {};
      this.sessions = {};
    }
  }

  setUsername(username) {
    this.username = username;
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
  }

  getPreference(key) {
    return this.preferences[key];
  }

  saveSession(
    sessionName,
    sessionPreferences = { maxPeers: 10, maxDownloadsPerPeer: 2 }
  ) {
    this.sessions[sessionName] = { ...sessionPreferences };
  }

  getSession(sessionName) {
    return this.sessions[sessionName];
  }

  addBlockedUsername(username) {
    this.blockedUsernames = [...new Set([...this.blockedUsernames, username])];
  }

  removeBlockedUsername(username) {
    this.blockedUsernames = this.blockedUsernames.filter(
      (_username) => _username !== username
    );
  }
}

module.exports = IrisProtocolUser;
