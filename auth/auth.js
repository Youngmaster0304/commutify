const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

let users = {};

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch {
    users = {};
  }
  return users;
}

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function signup(name, email, password) {
  loadUsers();
  const emailKey = email.toLowerCase().trim();
  if (users[emailKey]) {
    return { error: 'Email already registered' };
  }
  const { salt, hash } = hashPassword(password);
  const token = generateToken();
  users[emailKey] = {
    name: name.trim(),
    email: emailKey,
    salt,
    hash,
    token,
    created: new Date().toISOString(),
  };
  saveUsers();
  return {
    user: { name: users[emailKey].name, email: users[emailKey].email },
    token,
  };
}

function login(email, password) {
  loadUsers();
  const emailKey = email.toLowerCase().trim();
  const user = users[emailKey];
  if (!user) {
    return { error: 'Invalid email or password' };
  }
  if (!verifyPassword(password, user.salt, user.hash)) {
    return { error: 'Invalid email or password' };
  }
  const token = generateToken();
  user.token = token;
  saveUsers();
  return {
    user: { name: user.name, email: user.email },
    token,
  };
}

function validateToken(token) {
  loadUsers();
  for (const [email, user] of Object.entries(users)) {
    if (user.token === token) {
      return { name: user.name, email: user.email };
    }
  }
  return null;
}

function logout(token) {
  loadUsers();
  for (const [email, user] of Object.entries(users)) {
    if (user.token === token) {
      user.token = null;
      saveUsers();
      return true;
    }
  }
  return false;
}

module.exports = { signup, login, validateToken, logout };
