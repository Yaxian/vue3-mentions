<script>
  import {
    defineComponent,
    ref,
    watch,
    h
  } from 'vue'
  import { getSuggestionHtmlId } from './utils/index'

  import Suggestion from './Suggestion.vue'

  const getID = suggestion => {
    if (typeof suggestion === 'string') {
      return suggestion
    }

    return suggestion.id
  }

  export default defineComponent({
    name: 'SuggestionsOverlay',
    props: {
      id: {
        type: String,
      },
      suggestions: {
        type: Object,
      },
      a11ySuggestionsListLabel: {
        type: String,
      },
      focusIndex: {
        type: Number,
      },
      isLoading: {
        type: Boolean,
      },
      onSelect: {
        type: Function,
      },
      containerRef: {
        type: Function,
        default: () => ({}),
      },
      onMouseDown: {
        type: Function,
        default: () => ({}),
      },
      onMouseEnter: {
        type: Function,
        default: () => ({}),
      },
    },

    setup(props, { slots }) {
      const ulElement = ref(null)

      function setUlElement(el) {
        ulElement.value = el?.$el || el
      }

      watch(() => props.focusIndex, () => {
        if (!ulElement.value) {
          return
        }
        const el = ulElement.value.children[
          props.focusIndex
        ]
        el.scrollIntoViewIfNeeded()
      })

      function select(suggestion, queryInfo) {
        props.onSelect(suggestion, queryInfo)
      }

      function handleMouseEnter(index) {
        props.onMouseEnter?.(index)
      }

      function renderSuggestion(result, queryInfo, index) {
        const isFocused = index === props.focusIndex
        const { childIndex, query } = queryInfo
        const { renderSuggestion: propPenderSuggestion } = (slots.default?.() || [])[childIndex].props

        return h(Suggestion, {
          key: `${childIndex}-${getID(result)}`,
          id: getSuggestionHtmlId(props.id, index),
          query,
          index,
          renderSuggestion: propPenderSuggestion,
          suggestion: result,
          focused: isFocused || undefined,
          onClick: () => select(result, queryInfo),
          onMouseenter: () => handleMouseEnter(index)
        })
      }

      function renderSuggestions() {
        return Object.values(props.suggestions).reduce(
          (accResults, { results, queryInfo }) => [
            ...accResults,
            ...(results || []).map((result, index) => renderSuggestion(result, queryInfo, accResults.length + index)),
          ],
          [],
        )
      }

      function renderLoadingIndicator() {
        if (!props.isLoading) {
          return null
        }

        return h('span', 'loading...')
      }

      return () => {
        const {
          id,
          a11ySuggestionsListLabel,
          onMouseDown,
          containerRef,
        } = props

        return h('div', {
          onMousedown: onMouseDown,
          ref: containerRef
        }, [
          h('div', {
            ref: setUlElement,
            id,
            role: 'listbox',
            'aria-label': a11ySuggestionsListLabel
          }, renderSuggestions()),
          renderLoadingIndicator(),
        ])
      }
    },
  })
</script>
