/**
 * Convert new media requests.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const _      = require('lodash')
const debug  = require('debug')('media:converter')
const Config = require('../helpers/config')
const kue    = require('kue')
const queue  = kue.createQueue()

debug('init', Date.now())

const init   = async () => {
  const config = await Config('converter')


  console.log('config', config)

  require('./lib/download')(config, queue)
}

process.once( 'SIGTERM', function ( sig ) {
  queue.shutdown( 5000, function(err) {
    console.log( 'Kue shutdown: ', err||'' );
    process.exit( 0 );
  });
});

init()
