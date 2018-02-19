/**
 * Dynamic Environment Variables
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

module.exports = prop => {
  let response;
  switch(prop) {
    case 'redis':
      response = process.env.REDIS || 'redis://127.0.0.1:6379'
    break;

    case 'media':
      response = process.env.MEDIA || 'http://127.0.0.1:8001'
    break;

    default:
      response = null;
    break;
  }

  return response
}
