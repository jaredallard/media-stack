// Searches 'Templates' for a card with the same name as the board a card was
// just moved into

const debug  = require('debug')('media:events:tello:addChecklist')
const _      = require('lodash')
const Trello = require('trello')

module.exports = {
  type: 'updateCard',
  function: async (event, config) => {
    const trello        = new Trello(
      config.keys.trello.key,
      config.keys.trello.token
    )
    const card          = event.action

    if(!card.data.listAfter) return debug('not a list change.')

    const templatesList = config.instance.flow_ids.templates
    const cardId        = card.data.card.id
    const newListName   = card.data.listAfter.name

    if(!config.instance.copy_checklists) return debug('checklist copying disabled')

    const templates = await trello.getCardsForList(templatesList)
    const matching = _.find(templates, {
      name: newListName
    })

    if(!matching) return debug('no matching cards')

    const checklistId = matching.idChecklists[0]
    debug('process-checklist-candidate', checklistId, cardId)

    const newChecklist = await trello.makeRequest('get', `/1/checklist/${checklistId}`, {
      fields: 'name'
    })
    const newChecklistName = newChecklist.name

    debug('new-checklist-name', newChecklistName)

    // search for existing checklists with the same name
    const existingChecklists = await trello.makeRequest('get', `/1/cards/${cardId}/checklists`, {
      fields: 'name'
    })
    const matchingChecklistName = _.find(existingChecklists, {
      name: newChecklistName
    })

    if(matchingChecklistName) return debug('found existing checklist.')

    await trello.makeRequest('post', `/1/cards/${cardId}/checklists`, {
      idChecklistSource: checklistId
    })

    debug('matching card', matching)
  }
}
