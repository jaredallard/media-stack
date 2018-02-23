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

const status = async (queue, type, id) => {
  return new Promise((resolv, reject) => {
    queue.create('status', {
      id: id,
      status: type
    }).save(err => {
      if(err) return reject()
      return resolv()
    })
  })
}

module.exports = (config, queue, emitter) => {
  emitter.once('deploy', async job => {
    const mediaConfig = await Config('media') // for types
    const media_host  = dyn('media')

    // TODO: add support for movie
    const type = 'tv'
    debug('deploy', job, media_host)

    job.job.progress(201, 300, 'deploying')

    // create the new media
    debug('deploy:create', job.name, job.id)
    try {
      await request({
        method: 'POST',
        url: `${media_host}/v1/media`,
        body: {
          name: job.name,
          id: job.id,
          files: job.files.length,
          type: type
        },
        json: true
      })
    } catch(e) {
      debug('deploy', 'failed to create release')
      status(queue, 'error', job.id)
      throw e;
    }

    debug('deploy', 'starting file upload')
    async.eachLimit(job.files, 1, async file => {
      debug('upload', `${job.id} --- ${file.path}`)

      await request({
        url: `${media_host}/v1/media/${job.id}`,
        method: 'PUT',
        form: {
          file: fs.createReadStream(file.path),
          rel_path: file.path
        }
      })
    }, err => {
      if(err) throw err;

      job.job.progress(300, 300, 'deployed')
      debug('deploy', 'successfully deployed')
      job.job.done()
      status(queue, 'deployed', job.id)
    })
  })
};
