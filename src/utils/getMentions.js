import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentions = (value, config) => {
  const mentions = []
  iterateMentionsMarkup(
    value,
    config,
    (match, index, plainTextIndex, id, display, childIndex, start) => {
      mentions.push({
        id,
        display,
        childIndex,
        index,
        plainTextIndex,
        start,
      })
    },
  )
  return mentions
}

export default getMentions
