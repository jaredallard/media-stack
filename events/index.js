/**
 * Event Processor for the stack.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

'use strict';

const _       = require('lodash')
const Config  = require('../helpers/config')
const debug   = require('debug')('media:events')
const kue     = require('kue')

const init = async () => {
  const config = await Config('events')
  const trello = require('./lib/trello')
  const queue  = kue.createQueue()

  console.log('config', config)

  // start the trello listener
  const events = await trello(config.keys.trello, {
    callbackUrl: config.instance.webhook,
    board: config.instance.board
  })

  // media events
  require('./event/media')(events, queue, config)
  require('./event/status')(events, queue, config)
}

init()
