<script>
  import {
    defineComponent,
    ref,
    reactive,
    onMounted,
    onUpdated,
  } from 'vue'
  import isNumber from 'lodash/isNumber'

  import {
    iterateMentionsMarkup,
    mapPlainTextIndex,
    readConfigFromChildren,
  } from './utils'

  import initStyle from './style'

  initStyle()

  const generateComponentKey = (usedKeys, id) => {
    // eslint-disable-next-line no-prototype-builtins
    if (!usedKeys.hasOwnProperty(id)) {
      usedKeys[id] = 0
    } else {
      usedKeys[id] += 1
    }
    return `${id}_${usedKeys[id]}`
  }

  export default defineComponent({
    name: 'Highlighter',
    props: {
      singleLine: Boolean,
      onCaretPositionChange: {
        type: Function,
        default: () => ({}),
      },
      value: {
        type: String,
        default: '',
      },
      containerRef: {
        type: Function,
        default: () => ({}),
      },
      selectionStart: Number,
      selectionEnd: Number,
      bs: {
        type: Object,
        default: () => ({}),
      },
    },
    setup(props, { slots }) {
      const state = reactive({
        left: undefined,
        top: undefined,
      })

      const caretElement = ref(null)

      function setState(newState) {
        Object.keys(newState).forEach(key => {
          state[key] = newState[key]
        })
      }

      function setCaretElement(el) {
        caretElement.value = el
      }

      function notifyCaretPosition() {
        if (!caretElement.value) {
          return
        }

        const { offsetLeft, offsetTop } = caretElement.value

        if (state.left === offsetLeft && state.top === offsetTop) {
          return
        }

        const newPosition = {
          left: offsetLeft,
          top: offsetTop,
        }
        setState(newPosition)

        props.onCaretPositionChange(newPosition)
      }

      function renderSubstring(string, key) {
        // set substring span to hidden, so that Emojis are not shown double in Mobile Safari
        return (
          <span key={key} style={{ visibility: 'hidden' }}>
            {string}
          </span>
        )
      }

      function renderHighlighterCaret(children) {
        return (
          <span
            ref={setCaretElement}
            key="caret"
          >
            {children}
          </span>
        )
      }

      // Returns a clone of the Mention child applicable for the specified type to be rendered inside the highlighter
      function getMentionComponentForMatch(id, display, mentionChildIndex, key) {
        const cloneProps = { id, display, key }
        const child = (slots.default?.() || [])[mentionChildIndex]
        // const child = Children.toArray(this.props.children)[mentionChildIndex]
        // return React.cloneElement(child, props)
        if (!child) {
          return null
        }

        child.props = { ...(child.props || {}), ...cloneProps }
        return child
      }

      onMounted(() => {
        notifyCaretPosition()
      })

      onUpdated(() => {
        notifyCaretPosition()
      })

      return () => {
        const {
          selectionStart,
          selectionEnd,
          value,
          containerRef,
          singleLine,
        } = props

        const children = slots.default?.() || []
        const config = readConfigFromChildren(children)

        let caretPositionInMarkup
        if (selectionStart === selectionEnd) {
          caretPositionInMarkup = mapPlainTextIndex(
            value,
            config,
            selectionStart,
            'START',
          )
        }

        const resultComponents = []
        const componentKeys = {}

        // start by appending directly to the resultComponents
        let components = resultComponents
        let substringComponentKey = 0

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const textIteratee = (substr, index, indexInPlainText) => {
          // check whether the caret element has to be inserted inside the current plain substring
          if (
            isNumber(caretPositionInMarkup)
            && caretPositionInMarkup >= index
            && caretPositionInMarkup <= index + substr.length
          ) {
            // if yes, split substr at the caret position and insert the caret component
            const splitIndex = caretPositionInMarkup - index
            components.push(
              renderSubstring(
                substr.substring(0, splitIndex),
                substringComponentKey,
              ),
            )

            // add all following substrings and mention components as children of the caret component
            components = [
              renderSubstring(
                substr.substring(splitIndex),
                substringComponentKey,
              ),
            ]
          } else {
            // otherwise just push the plain text substring
            components.push(renderSubstring(substr, substringComponentKey))
          }

          substringComponentKey += 1
        }

        const mentionIteratee = (
          markup,
          index,
          indexInPlainText,
          id,
          display,
          mentionChildIndex,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          lastMentionEndIndex,
        ) => {
          // generate a component key based on the id
          const key = generateComponentKey(componentKeys, id)
          components.push(
            getMentionComponentForMatch(id, display, mentionChildIndex, key),
          )
        }

        iterateMentionsMarkup(value, config, mentionIteratee, textIteratee)

        // append a span containing a space, to ensure the last text line has the correct height
        components.push(' ')

        if (components !== resultComponents) {
          // if a caret component is to be rendered, add all components that followed as its children
          resultComponents.push(renderHighlighterCaret(components))
        }

        return (
          <div
            ref={containerRef}
            role="mentions-highlighter-container"
            bs={{
              'cmp.mention.wrapper': true,
              'cmp.mention.highlighter': true,
              height: singleLine ? 37 : null,
              ...props.bs,
            }}
          >
            {resultComponents}
          </div>
        )
      }
    },
  })
</script>
