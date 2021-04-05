<script>
  import {
    defineComponent,
  } from 'vue'


  const bs = {
    color: '#3a64ff', zIndex: 1, textShadow: '1px 1px 1px white, 1px -1px 1px white, -1px 1px 1px white, -1px -1px 1px white', position: 'relative',
  }

  export const MENTION_NAME = 'Mention'

  export default defineComponent({
    name: MENTION_NAME,
    props: {
      onAdd: {
        type: Function,
      },
      onRemove: {
        type: Function,
      },
      trigger: {
        type: [String, RegExp],
        default: '@',
      },
      markup: {
        type: String,
        default: '@[__display__](__id__)',
      },
      allowSpaceInQuery: {
        type: Boolean,
      },
      isLoading: {
        type: Boolean,
      },
      appendSpaceOnAdd: {
        type: Boolean,
        default: true,
      },
      displayTransform: {
        type: Function,
        default: (id, display) => display || id,
      },
      display: {
        type: String,
      },
      data: [Array, Function],
    },
    setup(props) {
      return () => {
        const { display } = props
        return (
          <span data-mention={display} bs={bs}>{display}</span>
        )
      }
    },
  })
</script>
