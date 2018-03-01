/**
 * Convert new media requests.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _      = require('lodash')
const fs     = require('fs-extra')
const path   = require('path')
const debug  = require('debug')('media:converter')
const Config = require('../helpers/config')
const dyn    = require('../helpers/dynamics')
const kue    = require('kue')
const K8     = require('kubernetes-client');
const queue  = kue.createQueue({
  redis: dyn('redis')
})

const K8_TOKEN = '/run/secrets/kubernetes.io/serviceaccount/token'

debug.log = console.log.bind(console)

debug('init', Date.now())

const init   = async () => {
  const config = await Config('converter')

  if(await fs.exists(K8_TOKEN)) {
    debug('k8', 'we\'re running in kubernetes')
    const core = new K8.Core({
      url: 'https://kubernetes:443',
      ca: await fs.readFile(path.join(path.dirname(K8_TOKEN), 'ca.crt')),
      auth: {
        bearer: await fs.readFile(K8_TOKEN, 'utf8')
      }
    });

    const namespace = await fs.readFile(path.join(path.dirname(K8_TOKEN), 'namespace'), 'utf8')

    const ourPod = process.env.HOSTNAME
    debug('k8:namespace', namespace, `${ourPod}?`)

    const pod = await core.namespaces('default').pods(ourPod).get()
    debug('k8:pod', pod)

    const nodeName = pod.spec.nodeName
    const node     = await core.nodes(nodeName).get()
    debug('k8:node', `running on node: '${nodeName}' `)
    debug('k8:node', node)

    const throttled = node.metadata.labels['triton.converter.upload']
    debug('k8:throttled', throttled ? true : false)
    if(throttled) {
      debug('k8:throttle:upload', throttled)
      config.instance.throttled = true
      config.instance.throttle_upload = throttled
    }
  }


  debug('eval-constraints', )

  await require('./lib/main')(config, queue)
}

init()

const cleanup = (code = 0) => {
  debug('cleanup')
  queue.shutdown(1000, err => {
    debug('kue:shutdown', err)
    process.exit(code);
  });
}

process.on('SIGINT', () => {
  cleanup()
})

// Handle shutdown / reject
process.on('unhandledRejection', error => {
  debug('Uncaught Execption:', error)

  cleanup(1)
});
