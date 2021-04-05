function registerThemeSpec() {
  return {}
}

const errorState = '&[data-error]'
const disabledState = '&:not([data-error])[disabled]'
const activeState = '&:not([disabled]):not([data-error])[data-active], &:not([disabled]):not([data-error]):focus, &:not([disabled]):not([data-error]):focus-within'
const hoverState = '&:not([disabled]):not([data-error]):not([data-active]):not(:focus):not(:focus-within):hover, &:not([disabled]):not([data-error]):not(:focus):not(:focus-within)[data-hover]'

export default function initStyle() {
  return [
    registerThemeSpec('cmp.mention', {
      container: {
        backgroundColor: '#fff',

      },
      wrapper: {
        p: 14,
      },
      highlighter: {
        color: 'transparent',
        width: '100%;',
        overflow: 'hidden',
        position: 'relative',
        overflowWrap: 'break-word',
        boxSizing: 'border-box',
        textAlign: 'start',
        whiteSpace: 'pre-wrap',
        border: '1px solid transparent',
      },
      position: {
        display: 'block',
        width: '100%',
        height: '100%',
        bottom: 0,
        position: 'absolute',
        margin: 0,
        top: 0,
        left: 0,
        backgroundColor: 'transparent',
      },
      input: {
        fontFamily: 'inherit',
        letterSpacing: 'inherit',
        fontSize: 'inherit',

        textRendering: 'unset',
        appearance: 'none',
        outline: 'none',

        boxSizing: 'border-box',
        verticalAlign: 'middle',
        color: 'body',
        caretColor: 'brand',
        resize: 'none',

        '&::placeholder': {
          color: 'ash',
        },

        border: 'outlineoutline',
        borderRadius: 'control',

        [errorState]: {
          borderColor: 'palette.danger.base',
        },
        [hoverState]: {
          borderColor: 'palette.outline.hover',
        },
        [activeState]: {
          borderColor: 'palette.brand.base',
        },
        [disabledState]: {
          cursor: 'not-allowed',
          bg: '#fbfbfb',
        },
      },
      count: {
        color: '#ccc',
        position: 'absolute',
        bottom: 0,
        right: 8,
      },
    }),
  ]
}
