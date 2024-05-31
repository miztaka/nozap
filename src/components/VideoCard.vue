<template>
  <v-card
    :class="cardClass"
    @click="clickAction"
  >
    <v-img
      :src="thumbnail(item)"
      width="200"
      cover
    ></v-img>
    <v-card-title v-tooltip:bottom="item.snippet.title">{{ item.snippet.title }}</v-card-title>
    <v-card-subtitle>{{ item.snippet.channelTitle }}</v-card-subtitle>
  </v-card>
</template>
<script>
export default {
  props: ['cardClass', 'item', 'clickAction'],
  methods: {
    thumbnail(item) {
      const th = item.snippet.thumbnails
      const obj = th.medium || th.standard || th.default
      return obj ? obj.url : ''
    }
  }
}
</script>
