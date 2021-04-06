<template>
  <div>
    <MentionsInput
      :value="value"
      :on-change="handleChange"
      suggestionsPortalHost="body"
    >
      <Mention
        trigger="@"
        :data="data"
      />
    </MentionsInput>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { MentionsInput, Mention } from 'vue3-mentions/src'
export default defineComponent({
  name: 'HelloWorld',
  components: {
    MentionsInput,
    Mention,
  },
  setup() {
    const value = ref('')
    const data = [
      {
        id: '1',
        display: 'Water White'
      }
    ]

    function handleChange(ev) {
      value.value = ev.target.value
    }

    return {
      value,
      data,
      handleChange,
    }
  }
})
</script>
