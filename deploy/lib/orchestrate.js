/**
 * ORCHESTRATE ALL THE THINGS
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _            = require('lodash')
const digitalocean = require('digitalocean')
const debug        = require('debug')('media:deploy:orchestrate')

module.exports = async (emitter, queue, opts) => {
  const ssh    = opts.ssh
  const config = opts.config
  const cloud  = opts.cloud
  const dropletConfig = config.instance.droplet

  queue.process('deploy', async (job, done) => {
    const data          = job.data
    const runtimeConfig = {
      name: 'convert-instance',
      monitoring: true,
      ipv6: true,
      private_networking: true,
      user_data: cloud,
      tags: [
        'convert',
        'dynamic'
      ]
    }

    const client   = digitalocean.client(config.keys.digitalocean.token)
    const droplets = await client.droplets.list()

    droplets.forEach(droplet => {
      debug('droplet', droplet.id, droplet.name)
    })

    debug('droplet-create', dropletConfig)
    const finalConfig = _.merge(dropletConfig, runtimeConfig)

    //const createDroplet = await client.droplets.create(finalConfig)
    //debug(createDroplet)

    debug('new-media', data.cardId)
    queue.create('newMedia', {
      id: data.id,
      card: data.card,
      media: data.media
    }).save()

    return done()
  })
}
