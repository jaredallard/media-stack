/**
 * Stashes new Media and organizes it.
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
  const config = await Config('media')

  await require('./lib/reciever')(config, queue, event)
}

init()
