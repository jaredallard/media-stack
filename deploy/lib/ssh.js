/**
 * Generate a SSH key if needed and return the key's public and private key.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const fs    = require('fs-extra')
const path  = require('path')
const gen   = require('ssh-keygen')

module.exports = async () => {
  const sshKey = path.join(__dirname, '..', 'ssh', 'key')
  const exists = await fs.exists(sshKey)

  if(exists) return {
    key:    await fs.readFile(sshKey, 'utf8'),
    pubKey: await fs.readFile(`${sshKey}.pub`, 'utf8')
  }
  
  return new Promise((resolv, reject) => {
    gen({
      location: sshKey,
      comment: `deploy key generated at ${Date.now()}`,
      password: '',
      read: true,
    }, (err, out) => {
      if(err) return reject(err)
      return resolv(out)
    })
  })
}
