/**
 * Webhook spawned by Trello.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const express = require('express')
const bodyp   = require('body-parser')
const debug   = require('debug')('media:events:trello:webhook')

const Config  = require('../../helpers/config')

module.exports = async (emitter, trelloEvents) => {
  let app = express()

  const config = await Config('events')

  app.use(bodyp.json())

  // actual URL pinged by Trello.
  app.use((req, res, next) => {
    //debug('got', req.body)

    if(!req.body.action || req.method === 'HEAD') return res.status(200).send()
    if(req.url === '/v1/health') return next() // quick fix for health check

    const action = req.body.action
    const type   = action.type

    if(trelloEvents[type]) trelloEvents[type].forEach(event => event(req.body, config))

    debug('emit', type)
    emitter.emit(type, action)

    return res.status(200).send()
  })

  app.get('/v1/health', (req, res) => {
    return res.status(200).send({
      message: 'healthy'
    })
  })

  app.listen(3401, () => {
    debug('webhook-listen', 3401)
  })
}
