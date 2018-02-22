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
const dyn    = require('../helpers/dynamics')
const kue    = require('kue')
const queue  = kue.createQueue({
  redis: dyn('redis')
})

const Event  = require('events').EventEmitter
const event  = new Event()

debug('init', Date.now())

const init   = async () => {
  const config = await Config('converter')

  await require('./lib/download')(config, queue, event)
  await require('./lib/process')(config, queue, event)
  await require('./lib/convert')(config, queue, event)
  await require('./lib/deploy')(config, queue, event)
}

init()

process.on('unhandledRejection', error => {
  debug('Uncaught Execption:', error)

  queue.shutdown(1000, err => {
    debug('kue:shutdown', err)
    process.exit(1);
  });
});
