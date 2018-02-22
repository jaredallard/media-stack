/**
 * Download new media.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _          = require('lodash')
const debug      = require('debug')('media:converter:download')
const sys        = require('../../helpers/sys.js')
const Webtorrent = require('webtorrent')
const request    = require('request-promise-native')
const path       = require('path')
const fs         = require('fs-extra')
const mkdirp     = require('mkdirp')
const async      = require('async')
const url        = require('url')

const client     = new Webtorrent()

const torrentProcessor = async (file, id, downloadPath) => {
  return new Promise((resolv, reject) => {
    const dir = path.dirname(file.path)
    if(dir !== '') {
      debug('mkdir', dir, file.path)
      mkdirp.sync(path.join(downloadPath, dir))
    }

    const realPath = path.join(downloadPath, file.path)

    const write = fs.createWriteStream(realPath)
    file.createReadStream().pipe(write)

    write.on('close', () => {
      debug('file', file.path, 'is done')
      return resolv()
    })
  })
}

const TIMEOUT = 240000

const methods = {
  /**
   * Download via torrent.
   *
   * @param {String} magnet          magnet link
   * @param {String} id              File ID
   * @param {String} downloadPath    Path to save file(s) in
   * @param {Object} job             Job Object
   * @return {Promise}               You know what to do.
   */
  magnet: async (magnet, id, downloadPath, job) => {
    debug('magnet', magnet.substr(0, 25)+'...')
    return new Promise((resolv, reject) => {
      const initStallHandler = setTimeout(() => {
        debug('init-stall', 'timeout')
        reject('Init stalled.')
      }, TIMEOUT) // 2 minutes

      client.add(magnet, {
        path: downloadPath
      }, torrent => {
        const hash = torrent.infoHash

        debug('hash', hash)
        debug('files', torrent.files.length)

        clearTimeout(initStallHandler)
        debug('init-stall', 'clearing init timeout')

        let lastProgress, stallHandler
        const downloadProgress = setInterval(() => {
          debug('download-progress', torrent.progress)

          // 0 - 1 * 100 = /100
          job.progress(torrent.progress * 100, 300, 'downloading')

          if(!stallHandler) {
            lastProgress = torrent.progress
            // check in 20000ms
            stallHandler = setInterval(() => {
              debug('check-download-progress', torrent.progress, lastProgress)

              // create it all over again.
              clearInterval(stallHandler)

              if(torrent.progress === lastProgress) {
                clearInterval(downloadProgress)
                return reject('Download stalled.')
              }
              lastProgress = torrent.progress
            }, TIMEOUT)
          }
        }, 60000) // 1 minute emit download progress stats

        torrent.on('error', err => {
          client.remove(hash)
          return reject(err)
        })

        torrent.on('done', () => {
          debug('done', hash)

          clearInterval(downloadProgress)
          clearInterval(stallHandler)

          client.remove(hash)

          return resolv()
        })
      })
    })
  },

  /**
   * Download via HTTP.
   *
   * @param  {String} resourceUrl   resource url
   * @param  {String} id            File ID
   * @param  {String} downloadPath  Path to download file too
   * @param  {Object} job           Job Object
   * @return {Promise}              .then/.catch etc
   */
  http: async (resourceUrl, id, downloadPath, job) => {
    debug('http', resourceUrl)

    return new Promise(async (resolv, reject) => {
      const parsed   = url.parse(resourceUrl);
      const filename = path.basename(parsed.pathname)
      const output   = path.join(downloadPath, filename)

      await mkdirp(downloadPath)

      debug('download', filename, output)
      const write    = fs.createWriteStream(output)
      request(resourceUrl).pipe(write)

      // assume it's downloadProgress
      write.on('close', () => {
        return resolv()
      })
    })
  }
}

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

// main function
module.exports = async (config, queue, emitter) => {
  // Download new media.
  queue.process('newMedia', 1, async (container, done) => {
    const data    = container.data
    const media   = data.media
    const fileId  = data.id

    debug('download', fileId, config.instance.download_path, data)

    let pathPrefix = ''
    if(!path.isAbsolute(config.instance.download_path)) {
      debug('path:not-absolute')
      pathPrefix = path.join(__dirname, '..')
    }

    const downloadPath = path.join(pathPrefix, config.instance.download_path, fileId)

    const download = /(\w+):([^)(\s]+)/g.exec(media.download)
    const url      = download[0]

    let protocol = download[1]

    // DO NOT EVER. EVER. Construct the url via the protocol. Always use the input.
    if(protocol === 'https') protocol = 'http'

    const method = methods[protocol]
    if(!method) throw new Error('Protocol not supported.')

    debug('downloading', fileId, downloadPath)
    mkdirp.sync(downloadPath)
    await status(queue, 'downloading', fileId)
    try {
      await method(url, fileId, downloadPath, container)
    } catch(err) {
      await status(queue, 'error', fileId)
      return done(err)
    }

    debug('download', 'finished')
    await status(queue, 'downloaded', fileId)

    container.progress(100, 300, 'downloading')

    emitter.emit('process', {
      job: container,
      id: fileId,
      card: data.card,
      path: downloadPath
    })

    container.done = err => done(err)
  })
}
