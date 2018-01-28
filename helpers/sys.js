/**
 * Get system information.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const sys = require('systeminformation')

module.exports = async () => {
  return {
    filesystems: await sys.fsSize()
  }
}
