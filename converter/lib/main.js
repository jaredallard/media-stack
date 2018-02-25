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
const Redis        = require('ioredis')
const dyn          = require('../../helpers/dynamics')

// Store EventEmitters here for future cleanup
const EmitterTable = {}

const stages = [
  'download',
  'process',
  'convert',
  'deploy'
]

const metricsDb = dyn('redis')+'/1'
debug('metrics:address', metricsDb)
const metrics = new Redis(metricsDb)

module.exports = async (config, queue) => {
  queue.process('newMedia', 1, async (container, done) => {
    const data    = container.data
    const media   = data.media
    const fileId  = data.id

    let type      = 'tv'

    const movieLabel = _.find(data.card.labels, {
      name: 'Movie'
    })
    if(movieLabel) type = 'movie'

    debug('media:job', fileId)
    debug('media:type', type)
    debug('emitter:new', fileId)
    debug('media:attempts', `${container._attempts || 1}/${container._max_attempts}`)
    const emitter = EmitterTable[fileId] = new EventEmitter()

    const staticData = {
      id: fileId,
      card: data.card,
      media,
      type
    }

    // callback system to keep scope
    let stage = 'queue' // track our stage
    emitter.on('done', data => {
      if(!data) data = {}

      const next = data.next

      // don't emit progress on error
      if(next !== 'error' ) emitter.emit('progress', 100)

      // update our stage
      stage      = next

      if(!next || next === '') return emitter.emit('finished')

      debug('emitter:callback:emit', next, data.data)

      // copy the object and extend our staticly passed data
      const staticCopy = _.create(staticData, {
        data: data.data
      })
      emitter.emit('progress', 0)
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

    // Emit progress events on pubsub
    emitter.on('progress', (percent) => {
      debug('metrics:progess', percent, stage)

      const data = {
        job: fileId,
        percent,
        stage
      }

      const safeData = JSON.stringify(data)
      metrics.publish('progress', safeData);
    })

    // error event
    emitter.on('error', data => {
      debug('media:job:errored', fileId)
      return done(data.data)
    })

    // dynamically generate our stages
    try {
      async.forEach(stages, async stage => {
        debug('instance:create', stage)

        const modulePath = path.join(__dirname, `${stage}.js`)
        const loggerInstance = require('debug')(`media:converter:${stage}:${fileId}`)

        loggerInstance.log = console.log.bind(console)
        await require(modulePath)(config, queue, emitter, loggerInstance)
      }, err => {
        if(err) return emitter.emit('done', {
          next: 'error',
          data: err
        })

        // kick off the queue
        emitter.emit('done', {
          next: stages[0],
          data: staticData
        })
      })
    } catch(err) {
      debug('error:main', 'caught', err)
      return emitter.emit('done', {
        next: 'error',
        data: err
      })
    }
  })

  debug('queue listener created')
}
