/**
 * Recieves new Media.
 *
 * @author Jared Allard
 * @license MIT
 * @version 1
 */

const express = require('express')
const debug   = require('debug')('media:twilight:reciever')
const path    = require('path')
const fs      = require('fs-extra')
const bp      = require('body-parser')
const mkdirp  = require('mkdirp')
const multer  = require('multer')

let app = express()

app.use(function(req, res, next) {
    var data = '';
    req.on('data', function(chunk) {
        data += chunk;
    });
    req.on('end', function() {
        req.rawBody = data;
        next();
    });
})
app.use(bp.json())

// Not sure if we want to persist ids since we're sorta a
// one shot service.
const mediaIds = {}

/**
 * Attempt to determine a name based on number.
 *
 * @param  {String} name         series name
 * @param  {String} originalName original file name
 * @return {String}              new file name
 */
const getName = (name, originalName) => {
  const matches = /.*?(?:e|\b)(\d+)\b[^-]/gi.exec(originalName)
  const num = parseInt(matches[matches.length-1], 0)

  debug('getName', matches, num)
  if(!num) throw new Error('Unable to determine series number.')

  return `${name} - ${num}.mkv`
}

module.exports = async (config, queue) => {
  let basePath = config.instance.location
  if(!path.isAbsolute(basePath)) {
    debug('path:is-absolute', false)
    basePath   = path.join(__dirname, '../', basePath)
  }
  debug('storage', basePath)

  const STAGING = path.join(basePath, 'staging')
  await mkdirp(STAGING)

  const staging = multer({
    dest: STAGING
  })

  const getPath = async (name, type) => {
    // HACK
    if(type.indexOf('..') !== -1) throw new Error('Directory traversel attempt.')
    if(name.indexOf('..') !== -1) throw new Error('Directory traversel attempt.')

    let typePath = type
    const configTypePath = config.instance.types[type]
    if(configTypePath) {
      typePath = configTypePath
      debug('config:type:path', type, '->', typePath)
    }

    return path.join(basePath, typePath, name)
  }

  const exists = async (name, type) => {
    const loc  = await getPath(name, type)
    if(await fs.exists(loc)) return true

    return false
  }

  /**
   * Health Check
   */
  app.get('/health', (req, res) => {
    return res.send({
      message: 'It works!'
    })
  })

  /**
   * Create a new media entry.
   */
  app.post('/v1/media', async (req, res) => {
    const type = req.body.type
    const name = req.body.name
    const id   = req.body.id

    if(!type || !name || !id) return res.status(400).send({
      success: false,
      message: 'Missing type, name, or id.'
    })

    const storeAt = await getPath(name, type)
    await mkdirp(storeAt)

    debug('new', type, name, id)

    debug('new:store', storeAt)

    mediaIds[id] = {
      name: name,
      type: type,
      path: storeAt
    }

    return res.send({
      data: {
        path: storeAt,
        existed: await exists(name, type)
      },
      success: true
    })
  })

  /**
   * Add a file to the media folder.
   */
  app.put('/v1/media/:id', staging.any(), async (req, res) => {
    const id = req.body.id || req.params.id
    const pointer = mediaIds[id]

    if(!pointer) return res.status(400).send({
      success: false,
      message: 'Media id not found.'
    })

    debug('media:add', id, pointer)
    debug('media:files', req.files)
    debug('media:raw', req.rawBody)
    if(!req.files) return res.status(400).send({
      success: false,
      message: 'No file provided.'
    })

    const file = req.files[0]
    if(!file) return res.status(400).send({
      success: false,
      message: 'Missing file.'
    })

    if(req.files.length !== 1) {
      await fs.unlink(file.path)
      return res.status(400).send({
        success: false,
        message: 'Multiple files is not supported yet.'
      })
    }

    let name;
    try {
      if(pointer.type === 'movie') name = `${pointer.name}.mkv`
      if(pointer.type === 'tv')    name = getName(pointer.name, file.originalname)
    } catch(e) {
      await fs.unlink(file.path)
      return res.status(400).send({
        success: false,
        message: 'Failed to determine name of media.'
      })
    }

    const output = path.join(pointer.path, name)
    debug('media:move', file.filename, '->', output)

    try {
      if(await fs.exists(output)) {
        debug('link:warn', `removed existing ${output}`)
        await fs.unlink(output)
      }

      await fs.move(file.path, output)
    } catch(e) {
      await fs.unlink(file.path)
      debug('link:err', e)
      return res.status(500).send({
        success: false,
        message: 'Failed to link media.'
      })
    }

    return res.send({
      success: true
    })
  })

  app.listen(8001, () => {
    debug('listening on *:8001')
  })
}
