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
const debug   = require('debug')('media:converter:deploy')
const Config  = require('../../helpers/config.js')
const dyn     = require('../../helpers/dynamics.js')
const request = require('request-promise-native')

module.exports = (config, queue, emitter) => {
  emitter.once('deploy', async job => {
    const mediaConfig = await Config('media') // for types
    const media_host  = dyn('media')
    const name        = job.card.name

    // TODO: add support for movie
    const type = 'tv'
    debug('deploy', job, media_host)

    // create the new media
    debug('deploy:create', name, job.id)
    await request({
      method: 'POST',
      url: `${media_host}/v1/media`,
      body: {
        name: name,
        id: job.id,
        files: job.files.length,
        type: type
      },
      json: true
    })

    debug('deploy', 'starting file upload')
    async.eachLimit(job.files, 1, async file => {
      debug('upload', `${job.id} --- ${file.path}`)

      await request({
        url: `${media_host}/v1/media/${job.id}`,
        method: 'PUT',
        form: {
          file: fs.createReadStream(file.path)
        }
      })
    }, err => {
      if(err) throw err;

      debug('deploy', 'successfully deployed')
      emitter.emit('status', 'deployed')
      return emitter.emit('done')
    })
  })
};
