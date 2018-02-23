/**
 * Main Media Processor
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1
 */

const _            = require('lodash')
const EventEmitter = require('events').EventEmitter
const debug        = require('debug')('media:converter:main')
const async        = require('async')
const path         = require('path')

// Store EventEmitters here for future cleanup
const EmitterTable = {}

const stages = [
  'download',
  'process',
  'convert',
  'deploy'
]


module.exports = async (config, queue) => {
  queue.process('newMedia', 1, async (container, done) => {
    const data    = container.data
    const media   = data.media
    const fileId  = data.id

    debug('media:job', fileId)
    debug('emitter:new', fileId)
    const emitter = EmitterTable[fileId] = new EventEmitter()

    const staticData = {
      id: fileId,
      card: data,
      media: media
    }


    // callback system to keep scope
    emitter.on('done', data => {
      const next = data.next
      if(!next || next === '') return emitter.emit('finished')

      debug('emitter:callback:emit', next, data.data)

      // copy the object and extend our staticly passed data
      const staticCopy = _.create(staticData, {
        data: data.data
      })
      emitter.emit(next, staticCopy)
    })

    // finished event
    emitter.on('finished', () => {
      debug('media:job:finished', fileId)
      return done()
    })

    emitter.on('status', status => {
      queue.create('status', {
        id: fileId,
        status
      }).save(err => {
        if(err) return debug('status:err', fileId, err)
      })
    })

    // error event
    emitter.on('error', data => {
      debug('media:job:errored', fileId)
      return done(data.data)
    })
    
    // dynamically generate our stages
    async.forEach(stages, async stage => {
      debug('instance:create', stage)

      const modulePath = path.join(__dirname, `${stage}.js`)
      await require(modulePath)(config, queue, emitter)
    }, err => {
      if(err) return emitter.emit('done', {
        next: 'error',
        data: err
      })

      // kick off the queue
      emitter.emit(stages[0], staticData)
    })
  })

  debug('queue created')
}
