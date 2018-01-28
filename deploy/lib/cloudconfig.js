/**
 * Process the cloud-config file before deploying a droplet.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const path = require('path')
const fs   = require('fs-extra')

module.exports = async opts => {
  const cc        = path.join(__dirname, '../init_scripts/cloud-config.yaml')
  const template  = await fs.readFile(cc, 'utf8')

  let newTemplate = template
  Object.keys(opts).forEach(field => {
    const value = opts[field]

    newTemplate = newTemplate.replace(`{{${field}}}`, value)
  })

  return newTemplate
}
