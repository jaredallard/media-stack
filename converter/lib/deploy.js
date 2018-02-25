/**
 * Attempts to deploy new media.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _       = require('lodash')
const fs      = require('fs-extra')
const path    = require('path')
const async   = require('async')
const Config  = require('../../helpers/config.js')
const dyn     = require('../../helpers/dynamics.js')
const request = require('request-promise-native')

module.exports = async (config, queue, emitter, debug) => {
  emitter.once('deploy', async job => {
    const mediaConfig = await Config('media') // for types
    const media_host  = dyn('media')
    const name        = job.card.name
    const data        = job.data
    const files       = data.files
    const type        = job.type

    // TODO: add support for movie
    debug('deploy', data, type, media_host)

    // create the new media
    debug('deploy:create', name, type, job.id)
    await request({
      method: 'POST',
      url: `${media_host}/v1/media`,
      body: {
        name: name,
        id: job.id,
        files: files.length,
        type: type
      },
      json: true
    })

    debug('deploy', 'starting file upload')
    async.eachLimit(files, 1, async file => {
      debug('upload', `${job.id} --- ${file}`)

      if(!await fs.exists(file)) {
        debug('upload:err', file, 'not found')
        throw new Error(`${file} not found.`)
      }

      await request({
        url: `${media_host}/v1/media/${job.id}`,
        method: 'PUT',
        formData: {
          file: fs.createReadStream(file)
        }
      })
    }, err => {
      if(err) return emitter.emit('done', {
        next: 'error',
        data: err
      })

      debug('deploy', 'successfully deployed')
      emitter.emit('status', 'deployed')
      return emitter.emit('done')
    })
  })
};
