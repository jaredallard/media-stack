/**
 * Spin up converter instances
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const debug  = require('debug')('media:deploy')
const Config = require('../helpers/config')
const kue    = require('kue')
const fs     = require('fs-extra')
const path   = require('path')
const queue  = kue.createQueue()

const Event  = require('events').EventEmitter
const event  = new Event()

debug('init', Date.now())

const init   = async () => {
  const config = await Config('deploy')

  const serviceYaml = await fs.readFile(path.join(__dirname, '../config/config.yaml'))

  const sshKey = await require('./lib/ssh')()
  const cloudConfig = await require('./lib/cloudconfig')({
    SSH_KEY: sshKey.pubKey,
    SERVICE_YAML: serviceYaml.toString('base64')
  })

  await require('./lib/orchestrate')(event, queue, {
    config: config,
    cloud: cloudConfig,
    key: sshKey
  })

  //debug('ssh-key', sshKey)
  //debug('cloud-config', cloudConfig)
}

init()
