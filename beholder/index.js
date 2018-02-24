/**
 * Beholder - metrics and event system
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const Redis = require('ioredis')
const dyn   = require('../helpers/dynamics')
const debug = require('debug')('media:beholder')

const metricsDb = dyn('redis')+'/1'
debug('metrics:address', metricsDb)
const listener = new Redis(metricsDb)
const redis    = new Redis(metricsDb)

listener.subscribe('progress', err => {
  if(err) throw err;
})


const events = {
  /**
   * Emit progress events
   * @param  {String}  job  Job ID
   * @param  {Object}  data Metric Object
   * @return {Promise}      ...
   */
  progress: async (job, data) => {
    const { percent, stage } = data
    const key                = `job:${job}:${stage}`

    if(stage === 'error') return; // skip error events for now

    const now = Date.now()
    if(percent === 100) {
      redis.hset(key, 'finished', now)
      debug('progress', job, 'finished', stage)

      const startedAt = await redis.hget(key, 'started')
      const diff      = now - startedAt

      debug('progress', job, stage, `took '${diff}ms'`)
    } else if(percent === 0) {
      debug('progress', job, 'started', stage)
      redis.hset(key, 'started', now)
    }

    redis.hset(key, 'percent', percent)
  }
}

listener.on('message', async (chan, msg) => {
  const data = JSON.parse(msg)
  const event = events[chan]

  if(!event) return debug('metric', chan, 'not implemented')
  await event(data.job, data)
})
