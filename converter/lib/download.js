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
      debug('mkdir', dir)
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

const methods = {
  /**
   * Download via torrent.
   *
   * @param {String} magnet          magnet link
   * @param {String} id              File ID
   * @param {String} downloadPath    Path to save file(s) in
   * @return {Promise}               You know what to do.
   */
  magnet: async (magnet, id, downloadPath) => {
    debug('magnet', magnet.substr(0, 25)+'...')
    return new Promise((resolv, reject) => {
      client.add(magnet, torrent => {
        const hash = torrent.infoHash

        debug('hash', hash)
        debug('files', torrent.files.length)

        let lastProgress, stallHandler
        const downloadProgress = setInterval(() => {
          debug('download-progress', torrent.progress)

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
            }, 20000)
          }
        }, 1000)

        async.eachLimit(torrent.files, 5,
          async file => torrentProcessor(file, id, downloadPath),
        err => { // I love that I can do this in a few lines.
          clearInterval(downloadProgress)
          clearInterval(stallHandler)

          if(err) return reject(err)
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
   * @param  {String} path          to save files in
   * @return {Promise}              .then/.catch etc
   */
  http: async (resourceUrl, id, downloadPath) => {
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
  queue.process('newMedia', async (container, done) => {
    const data    = container.data
    const media   = data.media
    const fileId  = data.id

    debug('download', fileId, config.instance.download_path, data)

    const downloadPath = path.join(__dirname, '..', config.instance.download_path, fileId)

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
      await method(url, fileId, downloadPath)
    } catch(err) {
      await status(queue, 'error', fileId)
      return done(err)
    }

    debug('download', 'finished')
    await status(queue, 'downloaded', fileId)

    emitter.emit('process', {
      id: fileId,
      path: downloadPath
    })

    return done(new Error('Error'))
  })
}
