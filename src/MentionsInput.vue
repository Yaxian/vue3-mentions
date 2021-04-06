<script>
  import {
    defineComponent,
    reactive,
    ref,
    onMounted,
    computed,
    Teleport,
    h,
  } from 'vue'

  import { MENTION_NAME } from './Mention.vue'

  import {
    applyChangeToValue,
    countSuggestions,
    escapeRegex,
    findStartOfMentionInPlainText,
    getEndOfLastMention,
    getMentions,
    getPlainText as handleGetPlainText,
    getSubstringIndex,
    makeMentionsMarkup,
    mapPlainTextIndex,
    readConfigFromChildren,
    spliceString,
    getSuggestionHtmlId,
    isNumber,
  } from './utils/index'

  import Highlighter from './Highlighter.vue'
  import SuggestionsOverlay from './SuggestionsOverlay.vue'
  import initStyle from './style'

  initStyle()

  export const makeTriggerRegex = (trigger, options = {}) => {
    if (trigger instanceof RegExp) {
      return trigger
    }
    const { allowSpaceInQuery } = options
    const escapedTriggerChar = escapeRegex(trigger)

    // first capture group is the part to be replaced on completion
    // second capture group is for extracting the search query
    return new RegExp(
      `(?:^|\\s)(${escapedTriggerChar}([^${
        allowSpaceInQuery ? '' : '\\s'
      }${escapedTriggerChar}]*))$`,
    )
  }

  const getDataProvider = (data, ignoreAccents = false) => {
    if (Array.isArray(data)) {
      // if data is an array, create a function to query that
      return query => {
        const results = []
        for (let i = 0, l = data.length; i < l; ++i) {
          const display = data[i].display || data[i].id
          if (getSubstringIndex(display, query, ignoreAccents) >= 0) {
            results.push(data[i])
          }
        }
        return results
      }
    }
    // expect data to be a query function
    return data
  }

  const getComputedStyleLengthProp = (forElement, propertyName) => {
    const length = parseFloat(
      window.getComputedStyle(forElement, null).getPropertyValue(propertyName),
    )
    return Number.isFinite(length) ? length : 0
  }

  const KEY = {
    TAB: 9,
    RETURN: 13,
    ESC: 27,
    UP: 38,
    DOWN: 40,
  }

  let isComposing = false

  export default defineComponent({
    name: 'MentionsInput',
    components: {
      Highlighter,
      Teleport,
      SuggestionsOverlay,
    },
    props: {
      /**
       * 输入空格的时候保持下拉框 open
       */
      allowSpaceInQuery: Boolean,
      /**
       * 允许下拉框在光标上面
       */
      allowSuggestionsAboveCursor: Boolean,

      value: {
        type: String,
        default: '',
      },
      onKeyDown: {
        type: Function,
        default: () => ({}),
      },
      onSelect: {
        type: Function,
        default: () => ({}),
      },
      onBlur: {
        type: Function,
        default: () => ({}),
      },
      onChange: {
        type: Function,
        default: null,
      },
      /**
       * 下拉框挂载到自定义 DOM 上面
       */
      suggestionsPortalHost: {
        type: String,
        default: null,
      },

      bs: {
        type: Object,
        default: () => ({}),
      },

      placeholder: {
        type: String,
        default: '',
      },
      /**
       * HighLighter 样式
       */
      highlighterBs: {
        type: Object,
        default: () => ({}),
      },

      /**
       * 输入框样式
       */
      inputBs: {
        type: Object,
        default: () => ({}),
      },

      /**
       * 输入框 只读
       */
      readonly: {
        type: Boolean,
        default: false,
      },

      /**
       * 输入框 disabled
       */
      disabled: {
        type: Boolean,
        default: null,
      },

      /**
       * 最大行
      */
      maxLine: {
        type: Number,
        default: null,
      },

      /**
       * 纯文本 最大字数
       */
      maxLength: {
        type: Number,
        default: null,
      },
    },
    emits: ['change', 'changePlainText'],
    setup(props, { slots, emit }) {
      const suggestions = ref({})
      const state = reactive({
        focusIndex: 0,
        selectionStart: null,
        selectionEnd: null,

        suggestions: {},

        caretPosition: null,
        suggestionsPosition: {},
      })

      function setState(newState) {
        Object.keys(newState).forEach(key => {
          state[key] = newState[key]
        })
      }

      const computedChildren = computed(() => {
        const mentionChildren = (slots.default?.() || []).filter(
          vnode => vnode.type?.name === MENTION_NAME,
        )
        return mentionChildren
      })

      const uuidSuggestionsOverlay = ref(Math.random().toString(16).substring(2))
      const containerElement = ref(null)
      const inputElement = ref(null)
      const highlighterElement = ref(null)
      const suggestionsElement = ref(null)
      const queryId = ref(0)
      const suggestionsMouseDown = ref(false)

      function setContainerElement(el) {
        containerElement.value = el?.$el || el
      }

      function setInputElement(el) {
        inputElement.value = el?.$el || el
      }

      function setHighlighterElement(el) {
        highlighterElement.value = el?.$el || el
      }

      function setSuggestionsElement(el) {
        suggestionsElement.value = el?.$el || el
      }

      function getPlainText() {
        const txt = handleGetPlainText(
          props.value || '',
          readConfigFromChildren(computedChildren.value),
        )
        return txt
      }

      function executeOnChange(event, ...args) {
        if (props.onChange) {
          return props.onChange(event, ...args)
        }

        if (props.valueLink) {
          return props.valueLink.requestChange(event.target.value, ...args)
        }
        return undefined
      }

      function updateHighlighterScroll() {
        const input = inputElement.value
        const highlighter = highlighterElement.value
        if (!input || !highlighter) {
          // since the invocation of this function is deferred,
          // the whole component may have been unmounted in the meanwhile
          return
        }
        highlighter.scrollLeft = input.scrollLeft
        highlighter.scrollTop = input.scrollTop
        highlighter.height = input.height
      }

      function updateSuggestions(
        _queryId,
        childIndex,
        query,
        querySequenceStart,
        querySequenceEnd,
        plainTextValue,
        results,
      ) {
        // neglect async results from previous queries
        if (_queryId !== queryId.value) return

        // save in property so that multiple sync state updates from different mentions sources
        // won't overwrite each other
        suggestions.value = {
          ...suggestions.value,
          [childIndex]: {
            queryInfo: {
              childIndex,
              query,
              querySequenceStart,
              querySequenceEnd,
              plainTextValue,
            },
            results,
          },
        }

        const { focusIndex } = state
        const suggestionsCount = countSuggestions(suggestions.value)
        setState({
          suggestions: suggestions.value,
          focusIndex:
            focusIndex >= suggestionsCount
              ? Math.max(suggestionsCount - 1, 0)
              : focusIndex,
        })
      }

      function queryData(
        query,
        childIndex,
        querySequenceStart,
        querySequenceEnd,
        plainTextValue,
      ) {
        const mentionChild = computedChildren.value[childIndex]
        if (!mentionChild) {
          return
        }
        const provideData = getDataProvider(mentionChild.props.data)
        if (!provideData) {
          return
        }
        const syncResult = provideData(
          query,
          updateSuggestions.bind(
            null,
            queryId.value,
            childIndex,
            query,
            querySequenceStart,
            querySequenceEnd,
            plainTextValue,
          ),
        )
        if (syncResult instanceof Array) {
          updateSuggestions(
            queryId.value,
            childIndex,
            query,
            querySequenceStart,
            querySequenceEnd,
            plainTextValue,
            syncResult,
          )
        }
      }

      function updateMentionsQueries(plainTextValue, caretPosition) {
        // Invalidate previous queries. Async results for previous queries will be neglected.
        queryId.value += 1
        suggestions.value = {}
        setState({
          suggestions: {},
        })

        const value = props.value || ''
        const config = readConfigFromChildren(computedChildren.value)

        const positionInValue = mapPlainTextIndex(
          value,
          config,
          caretPosition,
          'NULL',
        )

        // If caret is inside of mention, do not query
        if (positionInValue === null) {
          return
        }

        // Extract substring in between the end of the previous mention and the caret
        const substringStartIndex = getEndOfLastMention(
          value.substring(0, positionInValue),
          config,
        )
        const substring = plainTextValue.substring(
          substringStartIndex,
          caretPosition,
        )

        // Check if suggestions have to be shown:
        // Match the trigger patterns of all Mention children on the extracted substring
        computedChildren.value.forEach((child, childIndex) => {
          if (!child) {
            return
          }
          const regex = makeTriggerRegex(child.props.trigger || child.type.props.trigger.default, props)
          const match = substring.match(regex)
          if (match) {
            const querySequenceStart = substringStartIndex + substring.indexOf(match[1], match.index)
            queryData(
              match[2],
              childIndex,
              querySequenceStart,
              querySequenceStart + match[1].length,
              plainTextValue,
            )
          }
        })
      }
      function clearSuggestions() {
        // Invalidate previous queries. Async results for previous queries will be neglected.
        queryId.value += 1
        suggestions.value = {}
        setState({
          suggestions: {},
          focusIndex: 0,
        })
      }

      // Handle input element's select event
      function handleSelect(ev) {
        // keep track of selection range / caret position
        setState({
          selectionStart: ev.target.selectionStart,
          selectionEnd: ev.target.selectionEnd,
        })
        // do nothing while a IME composition session is active
        if (isComposing) return

        // refresh suggestions queries
        const el = inputElement.value
        if (ev.target.selectionStart === ev.target.selectionEnd) {
          updateMentionsQueries(el.value, ev.target.selectionStart)
        } else {
          clearSuggestions()
        }

        // sync highlighters scroll position
        updateHighlighterScroll()

        props.onSelect?.(ev)
      }

      function shiftFocus(delta) {
        const suggestionsCount = countSuggestions(state.suggestions)

        setState({
          focusIndex:
            (suggestionsCount + state.focusIndex + delta) % suggestionsCount,
        })
      }

      // Handle input element's change event
      // debounce not works well
      const handleChange = ev => {
        isComposing = false
        // if we are inside iframe, we need to find activeElement within its contentDocument
        const currentDocument = document.activeElement?.contentDocument || document
        if (currentDocument.activeElement !== ev.target) {
          // fix an IE bug (blur from empty input element with placeholder attribute trigger "input" event)
          return
        }

        const value = props.value || ''
        const config = readConfigFromChildren(computedChildren.value)

        let newPlainTextValue = ev.target.value

        // Derive the new value to set by applying the local change in the textarea's plain text
        const newValue = applyChangeToValue(
          value,
          newPlainTextValue,
          {
            selectionStartBefore: state.selectionStart,
            selectionEndBefore: state.selectionEnd,
            selectionEndAfter: ev.target.selectionEnd,
          },
          config,
        )

        // In case a mention is deleted, also adjust the new plain text value
        newPlainTextValue = handleGetPlainText(newValue, config)

        // Save current selection after change to be able to restore caret position after rerendering
        let selectionStart = ev.target.selectionStart
        let selectionEnd = ev.target.selectionEnd
        let setSelectionAfterMentionChange = false

        // Adjust selection range in case a mention will be deleted by the characters outside of the
        // selection range that are automatically deleted
        const startOfMention = findStartOfMentionInPlainText(
          value,
          config,
          selectionStart,
        )

        if (startOfMention !== undefined && state.selectionEnd > startOfMention) {
          // only if a deletion has taken place
          selectionStart = startOfMention
          selectionEnd = selectionStart
          setSelectionAfterMentionChange = true
        }

        setState({
          selectionStart,
          selectionEnd,
          setSelectionAfterMentionChange,
        })

        const mentions = getMentions(newValue, config)

        // Propagate change
        const eventMock = { target: { value: newValue } }

        executeOnChange(eventMock, newValue, newPlainTextValue, mentions)
        handleSelect(ev)
      }

      function addMention({ id, display }, {
        childIndex, querySequenceStart, querySequenceEnd, plainTextValue,
      }) {
        // Insert mention in the marked up value at the correct position
        const value = props.value || ''
        const config = readConfigFromChildren(computedChildren.value)
        const mentionsChild = computedChildren.value[childIndex]

        const markup = mentionsChild.props.markup || mentionsChild.type.props.markup.default
        const displayTransform = mentionsChild.props.displayTransform || mentionsChild.props['display-transform'] || mentionsChild.type.props.displayTransform.default
        const appendSpaceOnAdd = mentionsChild.props.appendSpaceOnAdd || mentionsChild.type.props.appendSpaceOnAdd.default
        const onAdd = mentionsChild.props.onAdd || mentionsChild.type.props.onAdd.default

        const start = mapPlainTextIndex(value, config, querySequenceStart, 'START')

        const end = start + querySequenceEnd - querySequenceStart
        let insert = makeMentionsMarkup(markup, id, display)
        if (appendSpaceOnAdd) {
          insert += ' '
        }
        const newValue = spliceString(value, start, end, insert)

        // Refocus input and set caret position to end of mention
        inputElement.value.focus()

        let displayValue = displayTransform(id, display)
        if (appendSpaceOnAdd) {
          displayValue += ' '
        }

        const newCaretPosition = querySequenceStart + displayValue.length

        setState({
          selectionStart: newCaretPosition,
          selectionEnd: newCaretPosition,
          setSelectionAfterMentionChange: true,
        })

        // Propagate change
        const eventMock = { target: { value: newValue } }
        const mentions = getMentions(newValue, config)
        const newPlainTextValue = spliceString(
          plainTextValue,
          querySequenceStart,
          querySequenceEnd,
          displayValue,
        )

        executeOnChange(eventMock, newValue, newPlainTextValue, mentions)

        if (onAdd) {
          onAdd(id, display)
        }

        // Make sure the suggestions overlay is closed
        clearSuggestions()
      }

      const isLoading = computed(() => {
        let flag = false
        computedChildren.value.forEach(child => {
          const childProps = child?.props || {}
          flag = (flag || (childProps.isLoading || childProps['is-loading']))
        })
        return !!flag
      })

      function selectFocused() {
        const { focusIndex } = state

        const { result, queryInfo } = Object.values(state.suggestions).reduce(
          (acc, { results, queryInfo: queryInfo1 }) => [
            ...acc,
            ...results.map(result1 => ({ result: result1, queryInfo: queryInfo1 })),
          ],
          [],
        )[focusIndex]

        addMention(result, queryInfo)

        setState({
          focusIndex: 0,
        })
      }

      function handleKeyDown(ev) {
        // do not intercept key events if the suggestions overlay is not shown
        const suggestionsCount = countSuggestions(state.suggestions)

        if (suggestionsCount === 0 || !suggestionsElement.value) {
          props.onKeyDown?.(ev)
          return
        }

        if (Object.values(KEY).indexOf(ev.keyCode) >= 0) {
          ev.preventDefault()
          ev.stopPropagation()
        }

        switch (ev.keyCode) {
          case KEY.ESC: {
            clearSuggestions()
            return
          }
          case KEY.DOWN: {
            shiftFocus(+1)
            return
          }
          case KEY.UP: {
            shiftFocus(-1)
            return
          }
          case KEY.RETURN: {
            selectFocused()
            return
          }
          case KEY.TAB: {
            selectFocused()
            break
          }
          default: {
            //
            break
          }
        }
      }

      function handleCaretPositionChange(position) {
        setState({ caretPosition: position })
      }

      function handleSuggestionsMouseDown() {
        suggestionsMouseDown.value = true
      }

      function handleSuggestionsMouseEnter(focusIndex) {
        setState({
          focusIndex,
        })
      }

      function setSelection(selectionStart, selectionEnd) {
        if (selectionStart === null || selectionEnd === null) {
          return
        }

        const el = inputElement.value
        if (el.setSelectionRange) {
          el.setSelectionRange(selectionStart, selectionEnd)
        } else if (el.createTextRange) {
          const range = el.createTextRange()
          range.collapse(true)
          range.moveEnd('character', selectionEnd)
          range.moveStart('character', selectionStart)
          range.select()
        }
      }

      function updateSuggestionsPosition() {
        const { caretPosition } = state
        const highlighter = highlighterElement.value
        const caretOffsetParentRect = highlighter.getBoundingClientRect()
        // first get viewport-relative position (highlighter is offsetParent of caret):
        const caretHeight = getComputedStyleLengthProp(highlighter, 'font-size')
        const viewportRelative = {
          left: caretOffsetParentRect.left + caretPosition?.left,
          top: caretOffsetParentRect.top + caretPosition?.top + caretHeight,
        }
        setState({
          suggestionsPosition: {
            position: 'fixed',
            left: `${viewportRelative.left}px`,
            top: `${viewportRelative.top}px`,
          },
        })
      }
      const isOpened = computed(() => {
        const test = isNumber(state.selectionStart) && (countSuggestions(state.suggestions) !== 0 || isLoading.value)
        return !!test
      })

      function handleClick(ev) {
        handleSelect(ev)
      }

      function handleBlur(ev) {
        const clickedSuggestion = suggestionsMouseDown.value
        suggestionsMouseDown.value = false

        // only reset selection if the mousedown happened on an element
        // other than the suggestions overlay
        if (!clickedSuggestion) {
          setState({
            selectionStart: null,
            selectionEnd: null,
          })
        }

        setTimeout(() => {
          updateHighlighterScroll()
        }, 1)

        props.onBlur?.(ev, clickedSuggestion)
      }

      function handleCompositionStart() {
        isComposing = true
      }
      function handleCompositionEnd() {
        isComposing = false
      }

      const inputProps = computed(() => {
        const {
          readOnly, disabled, readonly, maxLength, maxLine,
        } = props
        const plainText = getPlainText()
        const hasError = (isNumber(maxLine) && plainText.split('\n').length > maxLine) || (isNumber(maxLength) && plainText.trim().length > maxLength) || undefined

        return {
          value: plainText,
          readonly: readonly || undefined,
          disabled: disabled || undefined,
          placeholder: props.placeholder,
          'data-error': hasError,

          ...(!readOnly
            && !disabled && {
              onInput: handleChange,

              onSelect: handleSelect,
              onKeydown: handleKeyDown,
              onClick: handleClick,
              onBlur: handleBlur,
              onCompositionstart: handleCompositionStart,
              onCompositionend: handleCompositionEnd,
              onScroll: updateHighlighterScroll,
            }),

          ...(isOpened.value && {
            role: 'combobox',
            'aria-controls': uuidSuggestionsOverlay.value,
            'aria-expanded': true,
            'aria-autocomplete': 'list',
            'aria-haspopup': 'listbox',
            'aria-activedescendant': getSuggestionHtmlId(
              uuidSuggestionsOverlay.value,
              state.focusIndex,
            ),
          }),
        }
      })


      function renderSuggestionsOverlay() {
        if (!isNumber(state.selectionStart)) {
          // do not show suggestions when the input does not have the focus
          return null
        }

        const { position, left, top } = state.suggestionsPosition

        const suggestionsNode = h(SuggestionsOverlay, {
          id: uuidSuggestionsOverlay.value,
          position,
          left,
          top,
          focusIndex: state.focusIndex,
          scrollFocusedIntoView: state.scrollFocusedIntoView,
          containerRef: setSuggestionsElement,
          suggestions: state.suggestions,
          isLoading: isLoading.value,
          isOpened: isOpened.value,
          ignoreAccents: props.ignoreAccents,
          a11ySuggestionsListLabel: props.a11ySuggestionsListLabel,

          onMouseDown: handleSuggestionsMouseDown,
          onMouseEnter: handleSuggestionsMouseEnter,
          onSelect: addMention,
        }, slots.default)


        if (props.suggestionsPortalHost) {
          return h(Teleport, {
            to: props.suggestionsPortalHost
          }, suggestionsNode)
        } else {
          return suggestionsNode
        }
      }

      onMounted(() => {
        updateSuggestionsPosition()
      })

      return () => {
        const textProps = inputProps.value

        return h('div', {
          ref: setContainerElement,
          role: 'mentions-container',
          class: 'mentions-container',
        },
          h('div', {
            role: 'mentions-control',
            class: 'mentions-control'
          }, [
            h(Highlighter, {
              containerRef: setHighlighterElement,
              value: props.value,
              singleLine: false,
              selectionStart: state.selectionStart,
              selectionEnd: state.selectionEnd,
              onCaretPositionChange: handleCaretPositionChange,
              class: 'mentions-highlighter',
            }, slots.default),
            h('textarea', {
              ...textProps,
              ref: setInputElement,
              class: 'mentions-input'
            }),
            renderSuggestionsOverlay(),
          ])
        )
      }
    },
  })
</script>

<style scoped>
.mentions-container {
  position: relative;
  overflow-y: visible;
}

.mentions-control {
  background-color: #fff;
  position: relative;
}

.mentions-highlighter {
  color: transparent;
  width: 100%;;
  overflow: hidden;
  position: relative;
  overflow-wrap: break-word;
  box-sizing: border-box;
  text-align: start;
  white-space: pre-wrap;
  border: 1px solid transparent;
}

.mentions-input {
  font-family: inherit;
  letter-spacing: inherit;
  font-size: inherit;

  text-rendering: unset;
  appearance: none;
  outline: none;

  box-sizing: border-box;
  resize: none;

  display: block;
  width: 100%;
  height: 100%;
  bottom: 0;
  position: absolute;
  margin: 0;
  top: 0;
  left: 0;
  background-color: transparent;
}
</style>