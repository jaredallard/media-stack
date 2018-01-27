/**
 * Convert media from one format to another.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

 const _      = require('lodash')
 const fs     = require('fs-extra')
 const probe  = require('node-ffprobe')
 const path   = require('path')
 const debug  = require('debug')('media:converter:convert')
 const klaw   = require('klaw')
 const async  = require('async')
 const mkdirp = require('mkdirp')

 const conv   = require('../../helpers/handbrake-js/lib/handbrake-js.js')

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
   const settings = config.instance.settings
   const transcoding_path = path.join(
     __dirname,
     '..',
     config.instance.transcoding_path
   )

   const videoObject = {
     encoder: settings.video.codec,
     'encoder-profile': settings.video.profile,
     'encoder-preset': settings.video.preset,
     'encoder-tune': settings.video.tune,
     quality: settings.video.quality
   }

   const audioObject = {
     aencoder: settings.audio.codec,
     ab: settings.audio.bitrate
   }

   emitter.on('convert', async container => {
     await status(queue, 'processing', container.id)

     async.eachLimit(container.media, 1, (file, next) => {
       const audio  = file.audio
       const video  = file.video

       const filename = path.basename(file.path.replace(/\.\w+$/, '.mkv'))
       const output = path.join(transcoding_path, container.id, filename)

       debug('convert', filename, '->', output)

       // don't convert compatible containers
       if(audio.length === 0 && video.length === 0) return next(null)
       if(video.length === 0) return next(null) // can't just process audio rn.

       mkdirp.sync(path.dirname(output))
       const encodingLog = fs.createWriteStream(`${output}.encoding.log`)

       let convObject = {
         input: file.path,
         output: output
       }

       if(audio.length !== 0) {
         convObject = _.merge(convObject, audioObject)
       }

       convObject = _.merge(convObject, videoObject)

       let isDead = setTimeout(() => {
         return next('No output.')
       }, 20000)

       let progressReporter = setInterval(() => {
         debug('progress', container.id, filename, progress, eta)
       }, 10000)

       let progress, eta, endCatch, completed;
       conv.spawn(convObject)
        // on progress event
        .on('progress', prog => {
          if(isDead) {
            clearTimeout(isDead)
            isDead = null;
          }

          progress = prog.percentComplete
          eta      = prog.eta
        })

        // on recognized handbrake error
        .on('error', err => {
          return next(err)
        })

        // Fire when successfully converted
        .on('complete', () => {
          debug('hb-complete')

          // clear the end-but not complete catcher.
          clearTimeout(endCatch)

          return next()
        })

        // fired on handbrake output
        .on('output', output => {
          encodingLog.write(output.toString())
        })

        // fired when the process ends.
        .on('end', () => {
          // Catch complete not triggering (error-d)
          endCatch = setTimeout(() => {
            if(!completed) return next('Failed to convert. See log.')
          }, 5000)

          encodingLog.write('HB_END')
          encodingLog.end()

          debug('end', 'fired')
          clearInterval(progressReporter)
        })
     }, err => {
       debug('encoding-err', err)
       if(err) return status(queue, 'error', container.id)

       status(queue, 'complete', container.id)
     })
   })
 }
