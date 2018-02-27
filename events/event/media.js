/**
 * Media Related Events go here.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _      = require('lodash')
const debug  = require('debug')('media:events:event:media')
const Trello = require('trello')

/**
 * Parse Trello events / whatever into stack events.
 *
 * @param  {Event.EventEmitter} emitter event emitter
 * @param  {Object} queue               Kue queue
 * @param  {Object} config              config
 * @return {undefined}                  stop
 */
module.exports = (emitter, queue, config) => {
  const trello = new Trello(config.keys.trello.key, config.keys.trello.token)

  // Process new media.
  emitter.on('updateCard', async event => {
    if(!event.data.listAfter) return debug('newMedia', 'not a transfer card')

    const listNow       = event.data.listAfter.id
    const listBefore    = event.data.listBefore.id
    const cardId        = event.data.card.id
    const cardName      = event.data.card.name

    const metadataLabel = config.instance.labels.metadata

    const requestsBoard = config.instance.flow_ids.requests
    const readyBoard    = config.instance.flow_ids.ready

    if(listBefore !== requestsBoard) return debug('newMedia', 'origin not requests')
    if(listNow    !== readyBoard)    return debug('newMedia', 'dest not ready')

    debug('newMedia', 'adding new media', `${cardId}/${cardName}`)
    const card        = await trello.makeRequest('get', `/1/cards/${cardId}`)
    const attachments = await trello.makeRequest('get', `/1/cards/${cardId}/attachments`)

    const download = card.desc
    const source   = _.find(attachments, {
      name: 'SOURCE'
    })
    const mal      = _.find(attachments, {
      name: 'MAL'
    })

    if(!download || !source || !mal) {
      debug('newMedia', download, source, mal)
      return debug('newMedia', 'missing dl, source, or mal')
    }

    debug('newMedia', 'add-label', metadataLabel)
    await trello.makeRequest('post', `/1/cards/${cardId}/idLabels`, {
      value: metadataLabel
    })

    queue.create('deploy', {
      id: cardId,
      card: card,
      media: {
        source: source.url,
        mal: mal.url,
        download: download,
        type: 'unknown'
      }
    }).removeOnComplete( true ).save(err => {
      if(err) return debug('newMedia', 'failed to add to queue')
    })
  })
}
