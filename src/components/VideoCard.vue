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
    <v-card-text>
      <div class="text-subtitle-1 text-left">{{ item.snippet.title }}</div>
      <div class="font-weight-light text-right">{{ formatDate(item.snippet.publishedAt) }}</div>
    </v-card-text>
    <v-card-subtitle>{{ item.snippet.channelTitle }}</v-card-subtitle>
    <!--
    <v-card-title v-tooltip:bottom="item.snippet.title">{{ item.snippet.title }}</v-card-title>
    -->
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
    },
    formatDate(datestr) {
      return datestr.split('T')[0]
    }
  }
}
</script>
