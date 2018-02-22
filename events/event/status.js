/**
 * Update the status of cards based off of various services.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

 const _      = require('lodash')
 const debug  = require('debug')('media:events:event:status')
 const Trello = require('trello')

 /**
  * Parse status updates.
  *
  * @param  {Event.EventEmitter} emitter event emitter
  * @param  {Object} queue               Kue queue
  * @param  {Object} config              config
  * @return {undefined}                  stop
  */
 module.exports = (emitter, queue, config) => {
   const trello = new Trello(config.keys.trello.key, config.keys.trello.token)

   const labels = config.instance.labels
   const lists  = config.instance.flow_ids

   queue.process('status', 100, async (container, next) => {
     const data   = container.data
     const cardId = data.id
     const status = data.status

     debug('status-change', cardId, status)

     const pointer = labels[status]
     if(pointer) {
       debug('add-label', pointer)
       await trello.makeRequest('post', `/1/cards/${cardId}/idLabels`, {
         value: pointer
       })
     }

     const listPointer = lists[status]
     if(listPointer) {
       debug('move-card', listPointer)
       await trello.makeRequest('put', `/1/cards/${cardId}/idList`, {
         value: listPointer,
         pos:   2
       })
     }

     return next()
   })
}
