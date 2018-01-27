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

   queue.process('status', 100, (container, next) => {
     const data   = container.data
     const cardId = data.id
     const status = data.status

     debug('update', status)
     return done()
   })
}
