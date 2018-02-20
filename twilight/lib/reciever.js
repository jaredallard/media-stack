/**
 * Recieves new Media.
 *
 * @author Jared Allard
 * @license MIT
 * @version 1
 */

const express = require('express')
const debug   = require('debug')('media:twilight:reciever')
const path    = require('path')
const fs      = require('fs-extra')
const bp      = require('body-parser')

let app = express()

app.use(bp.json())

module.exports = (config, queue) => {

  /**
   * Health Check
   */
  app.get('/health', (req, res) => {
    return res.send({
      message: 'It works!'
    })
  })

  /**
   * Create a new media entry.
   */
  app.post('/v1/media', (req, res) => {
    const type = req.body.type
    const name = req.body.name
    const id   = req.body.id

    if(!type || !name || !id) return res.status(400).send({
      success: false,
      message: 'Missing type, name, or id.'
    })

    debug('new', type, name, id)

    return res.send({
      success: true
    })
  })

  /**
   * Add a file to the media folder.
   */
  app.put('/v1/media/:id', (req, res) => {
    debug('upload file')

    return res.send({
      success: true
    })
  })

  app.listen(8001, () => {
    debug('listening on *:8001')
  })
}
