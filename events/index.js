/**
 * Event Processor for the stack.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

'use strict';

const _        = require('lodash')
const Config   = require('../helpers/config')
const dyn      = require('../helpers/dynamics')
const kue      = require('kue')

const Event    = require('events').EventEmitter;
const event    = new Event()

const init = async () => {
  const config = await Config('events')
  const trello = require('./lib/trello')
  const queue  = kue.createQueue({
    redis: dyn('redis')
  })

  console.log('config', config)

  // start the trello listener
  const events = await trello(config.keys.trello, {
    callbackUrl: config.instance.webhook,
    board: config.instance.board,
    event: event
  })

  // media events
  await require('./event/media')(event, queue, config)
  await require('./event/status')(event, queue, config)
}

init()
