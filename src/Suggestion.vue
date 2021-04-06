<script>
  import { defineComponent, h } from 'vue'
  import {
    getSubstringIndex,
  } from './utils/index'

  export default defineComponent({
    name: 'Suggestion',
    props: {
      id: {
        type: String,
      },
      query: {
        type: String,
      },
      index: {
        type: Number,
      },
      suggestion: {
        type: [String, Object],
      },
      renderSuggestion: {
        type: Function,
      },
      focused: {
        type: Boolean,
      },
      isLoading: Boolean,
    },

    setup(props, { attrs }) {
      function getDisplay() {
        const { suggestion } = props

        if (typeof suggestion === 'string') {
          return suggestion
        }

        const { id, display } = suggestion

        if (id === undefined || !display) {
          return id
        }

        return display
      }

      function renderHighlightedDisplay(display) {
        const { query } = props

        const i = getSubstringIndex(display, query, false)

        if (i === -1) {
          return h('span', display)
        }

        return h('span', [
          display.substring(0, i),
          h('b', display.substring(i, i + query.length)),
          display.substring(i + query.length)
        ])
      }

      function renderContent() {
        const {
          query, renderSuggestion, suggestion, index, focused,
        } = props
        const display = getDisplay()
        const highlightedDisplay = renderHighlightedDisplay(display, query)

        if (renderSuggestion) {
          return renderSuggestion(
            suggestion,
            query,
            highlightedDisplay,
            index,
            focused,
          )
        }

        return highlightedDisplay
      }

      return () => {
        const { id } = props
        return h('li', {
          id,
          role: 'option',
          'aria-selected': props.focused || undefined,
        }, renderContent())
      }
    },
  })
</script>
