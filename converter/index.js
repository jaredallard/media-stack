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

debug.log = console.log.bind(console)

debug('init', Date.now())

const init   = async () => {
  const config = await Config('converter')

  await require('./lib/main')(config, queue)
}

init()

const cleanup = (code = 0) => {
  debug('cleanup')
  queue.shutdown(1000, err => {
    debug('kue:shutdown', err)
    process.exit(code);
  });
}

process.on('SIGINT', () => {
  cleanup()
})

// Handle shutdown / reject
process.on('unhandledRejection', error => {
  debug('Uncaught Execption:', error)

  cleanup(1)
});
