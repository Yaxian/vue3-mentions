import PLACEHOLDERS from './placeholders'
import countPlaceholders from './countPlaceholders'

export { default as getPlainText } from './getPlainText'
export { default as applyChangeToValue } from './applyChangeToValue'
export {
  default as findStartOfMentionInPlainText,
} from './findStartOfMentionInPlainText'
export { default as getMentions } from './getMentions'
export { default as getEndOfLastMention } from './getEndOfLastMention'
export { default as mapPlainTextIndex } from './mapPlainTextIndex'
export { default as spliceString } from './spliceString'
export { default as makeMentionsMarkup } from './makeMentionsMarkup'
export { default as iterateMentionsMarkup } from './iterateMentionsMarkup'
export { default as isNumber } from './isNumber'

export {
  countPlaceholders,
}
export const getSubstringIndex = (str, substr) => str.toLowerCase().indexOf(substr.toLowerCase())
export const escapeRegex = str => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
export const countSuggestions = suggestions => Object.values(suggestions).reduce(
  (acc, { results }) => acc + (results || []).length,
  0,
)
export const getSuggestionHtmlId = (prefix, id) => `${prefix}-${id}`
export const markupToRegex = markup => {
  const escapedMarkup = escapeRegex(markup)
  const charAfterDisplay = markup[markup.indexOf(PLACEHOLDERS.display) + PLACEHOLDERS.display.length]
  const charAfterId = markup[markup.indexOf(PLACEHOLDERS.id) + PLACEHOLDERS.id.length]
  return new RegExp(
    escapedMarkup
      .replace(
        PLACEHOLDERS.display,
        `([^${escapeRegex(charAfterDisplay || '')}]+?)`,
      )
      .replace(PLACEHOLDERS.id, `([^${escapeRegex(charAfterId || '')}]+?)`),
  )
}

// make sure that the custom regex defines the correct number of capturing groups
const coerceCapturingGroups = (regex, markup) => {
  const numberOfGroups = new RegExp(`${regex.toString()}|`).exec('').length - 1
  const numberOfPlaceholders = countPlaceholders(markup)

  if (process.env.NODE_ENV !== 'production') {
    if (numberOfGroups !== numberOfPlaceholders) {
      console.warn(
        `Number of capturing groups in RegExp ${regex.toString()} (${numberOfGroups}) does not match the number of placeholders in the markup '${markup}' (${numberOfPlaceholders})`,
      )
    }
  }

  return regex
}

export const readConfigFromChildren = children => children.map(vnode => {
  // vue template not trans kebab-case to camelCase
  // <vue :isLoading="true" :is-loading="true" />
  // vnode props will be { isLoading: true, is-loading: true }

  const props = vnode.props || {}
  const regex = props.regex
  const markup = props.markup || vnode.type.props.markup.default
  const displayTransform = props.displayTransform || props['display-transform']

  return {
    markup,
    regex: regex
      ? coerceCapturingGroups(regex, markup)
      : markupToRegex(markup),
    displayTransform: displayTransform || ((id, display) => display || id),
  }
})

export default readConfigFromChildren
