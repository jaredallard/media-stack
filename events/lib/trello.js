/**
 * Converts Trello Webhooks into processable events.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _      = require('lodash')
const Trello = require('trello')
const debug  = require('debug')('media:events:trello')
const fs     = require('fs-extra')
const path   = require('path')

const TRELLO_DIR  = path.join(__dirname, '..', 'trello')
const trelloTable = {
  'updateCard': []
}

const registerOneshots = async () => {
  const files = await fs.readdir(TRELLO_DIR)
  files.forEach(file => {
    const realPath = path.join(TRELLO_DIR, file)
    const method = require(realPath)

    const type = method.type
    const fn   = method.function

    if(!type || !fn) throw new Error(`${file}: invalid response (no .type/.fn)`)
    if(!trelloTable[type]) trelloTable[type] = []

    trelloTable[type].push(fn)
  })
}

registerOneshots()

let webhookDef = null;

/**
 * Create a trello webhook proccessor if needed.
 * Then setup the webhook listener.
 *
 * @param {Object} auth  Authentication
 * @param {Object} opts   optional engine stuff.
 * @return {Promise} ...
 */
const init = async (auth, opts) => {
  const token = auth.token
  const key   = auth.key

  const trello = new Trello(key, token)

  debug('auth', token, key, opts)

  // eval a short ID to a long ID, who care's if it's not one, just one HTTP call.
  const board    = await trello.makeRequest('get', `/1/boards/${opts.board}`)
  // debug('board', board)

  opts.board = board.id
  debug('new-board-id', board.id)

  if(!webhookDef) webhookDef = require('./webhook')(opts.event, trelloTable)

  // fetch webhooks
  const webhooks = await trello.makeRequest('get', `/1/tokens/${token}/webhooks`)
  const similarWebhooks = _.find(webhooks, {
    idModel: opts.board,
    active: true
  })

  if(similarWebhooks) {
    debug('webhook-found', similarWebhooks)
    trello.deleteWebhook(similarWebhooks.id)
    debug('webhook-remove', similarWebhooks.id)
  }

  const webhook  = await trello.addWebhook('Polls for updates on the media board.', opts.callbackUrl, opts.board)
  if(typeof webhook !== 'object') {
    debug('webhook-error', webhook)

    // Recursive function to ensure that we create the webhook
    return new Promise(resolv => {
      debug('webhook-retry', 'waiting 5000ms')
      setTimeout(async () => {
        await init(auth, opts)

        return resolv()
      }, 5000)
    })
  }
  debug('created webhook', webhook)

  return
}

module.exports = init
