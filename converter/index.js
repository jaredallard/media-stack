/**
 * Convert new media requests.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _      = require('lodash')
const debug  = require('debug')('media:converter')
const Config = require('../helpers/config')
const kue    = require('kue')
const queue  = kue.createQueue()

const Event  = require('events').EventEmitter
const event  = new Event()

debug('init', Date.now())

const init   = async () => {
  const config = await Config('converter')


  console.log('config', config)

  await require('./lib/download')(config, queue, event)
  await require('./lib/process')(config, queue, event)
  await require('./lib/convert')(config, queue, event)
}

init()
