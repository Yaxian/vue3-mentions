<template>
  <span :data-mention="display">{{ display }}</span>
</template>

<script>
  import {
    defineComponent,
  } from 'vue'

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
  })
</script>
