/**
 * Download new media.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const Webtorrent = require('webtorrent')
const request    = require('request-promise-native')
const path       = require('path')
const fs         = require('fs-extra')
const mkdirp     = require('mkdirp')
const url        = require('url')

const client     = new Webtorrent()

const TIMEOUT = 240000

// main function
module.exports = async (config, queue, emitter, debug) => {

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

            emitter.emit('progress', torrent.progress, 'download')

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
     * @return {Promise}              .then/.catch etc
     */
    http: async (resourceUrl, id, downloadPath) => {
      debug('http', resourceUrl)

      return new Promise(async (resolv) => {
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

  emitter.once('download', async job => {
    const data   = job.card
    const media  = job.media
    const fileId = job.id

    debug('download:id',   fileId)
    debug('download:name', data.name)
    debug('download:path', config.instance.download_path)

    let pathPrefix = ''
    if(!path.isAbsolute(config.instance.download_path)) {
      debug('path:not-absolute')
      pathPrefix = path.join(__dirname, '..')
    }

    const downloadPath = path.join(pathPrefix, config.instance.download_path, fileId)

    const download     = /(\w+):([^)(\s]+)/g.exec(media.download)
    const url          = download[0]

    let protocol       = download[1]

    if(protocol === 'https') protocol = 'http'

    const method = methods[protocol]
    if(!method) throw new Error('Protocol not supported.')

    debug('downloading', fileId, downloadPath)
    mkdirp.sync(downloadPath)
    emitter.emit('status', 'downloading')
    try {
      await method(url, fileId, downloadPath)
    } catch(err) {
      return emitter.emit('done', {
        next: 'error',
        data: err
      })
    }

    debug('download', 'finished')
    emitter.emit('status', 'downloaded')
    emitter.emit('done', {
      next: 'process',
      data: {
        path: downloadPath
      }
    })
  })
}
