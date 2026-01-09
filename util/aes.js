const AES = require('./aesjs');

function encrypt(text, key) {
  key = new TextEncoder().encode(key);
  const textBytes = AES.utils.utf8.toBytes(text);
  // eslint-disable-next-line new-cap
  const aesCtr = new AES.ModeOfOperation.ctr(key);
  const encryptedBytes = aesCtr.encrypt(textBytes);
  return AES.utils.hex.fromBytes(encryptedBytes);
}

function decrypt(encryptedHex, key) {
  key = new TextEncoder().encode(key);
  const encryptedBytes = AES.utils.hex.toBytes(encryptedHex);
  // eslint-disable-next-line new-cap
  const aesCtr = new AES.ModeOfOperation.ctr(key);
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);
  return AES.utils.utf8.fromBytes(decryptedBytes);
}

module.exports = {
  decrypt,
  encrypt,
};
