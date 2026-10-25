'use strict';
const crypto = require('node:crypto');
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function toBase32(bytes) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits -= 5)) & 31];
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
const secret = toBase32(crypto.randomBytes(20));
const account = encodeURIComponent('VanTien Study: admin');
console.log('\nPrivate setup key (keep SECRET, do not send to any chat):\n' + secret);
console.log('\nAuthenticator setup URI:\notpauth://totp/' + account + '?secret=' + secret + '&issuer=VanTien%20Study&algorithm=SHA1&digits=6&period=30');
console.log('\nAdd an account in Google Authenticator -> Enter a setup key -> paste the key above.');
console.log('Then set the SAME key as VANTIEN_ADMIN_TOTP_SEED in Firebase Functions secrets.');
