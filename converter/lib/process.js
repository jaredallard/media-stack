/**
 * Media post-processor. Determines if we need to convert or not.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _     = require('lodash')
const fs    = require('fs-extra')
const probe = require('node-ffprobe')
const path  = require('path')
const debug = require('debug')('media:converter:process')
const klaw  = require('klaw')
const async = require('async')

const mediaExts = [
  '.mp4',
  '.mkv',
  '.mov',
  '.webm'
]

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

const findMediaFiles = async absPath => {
  return new Promise((resolv, reject) => {
    const files = []
    klaw(absPath, {
      filter: item => {
        if(fs.statSync(item).isDirectory()) return true

        const ext = path.extname(item)
        if(mediaExts.indexOf(ext) !== -1) return true
        return false // filter non-media files.
      }
    })
    .on('data', item => {
      const stat = fs.statSync(item.path)
      if(stat.isDirectory()) return; // skip
      files.push(item.path)
    })
    .on('end', () => {
      return resolv(files)
    })
    .on('error', err => {
      return reject(err)
    })
  })
}

module.exports = async (config, queue, emitter) => {
  const audioCodec = config.instance.settings.audio.codec
  const videoCodec = config.instance.settings.video.codec

  debug('want', audioCodec, videoCodec)

  // determine if we need to process or not.
  emitter.on('process', async file => {
    debug('process', file)

    const listOfFiles = await findMediaFiles(file.path)

    debug('probe', listOfFiles)
    async.mapLimit(listOfFiles, 2, (media, next) => {
      probe(media, (err, stats) => {
        if(err) return next(err)

        const audioStreams = _.filter(stats.streams, audio => {
          if(audio.codec_type !== 'audio') return false
          if(audio.codec_name == audioCodec) return false
          return true;
        })

        const videoStreams = _.filter(stats.streams, video => {
          if(video.codec_type !== 'video') return false
          if(video.codec_name == videoCodec) return false
          return true;
        })

        return next(null, {
          path: media,
          audio: audioStreams,
          video: videoStreams
        })
      })
    }, (err, results) => {
      if(err) {
        debug('process-err', err)
        return status(queue, 'error', file.id)
      }
      debug(results)

      emitter.emit('convert', {
        id: file.id,
        media: results
      })
    })
  })
}
