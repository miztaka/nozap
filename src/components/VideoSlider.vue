<template>
  <v-slide-group
    v-model="selectedModel"
    class="mx-auto"
    selected-class="bg-success"
    show-arrows
  >
    <v-slide-group-item
      v-for="item in items"
      :key="item.etag"
      v-slot="{ isSelected, toggle, selectedClass }"
    >
      <VideoCard
        :cardClass="['ma-4', 'video-item', selectedClass]"
        :item="item"
        :clickAction="toggle"
      ></VideoCard>
    </v-slide-group-item>
  </v-slide-group>
</template>
<script>
export default {
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  computed: {
    selectedModel: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    }
  }
}
</script>