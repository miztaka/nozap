<template>
  <v-container class="fill-height">
    <v-responsive
      class="align-centerfill-height mx-auto"
      max-width="100%"
    >
      <v-app-bar :elevation="2">
        <template v-slot:prepend>
          <v-app-bar-nav-icon></v-app-bar-nav-icon>
        </template>
          <v-text-field
            v-if="googleReady"
            label="Seach"
            v-model="searchWords"
            append-inner-icon="mdi-magnify"
            @click:append-inner="doSearch"
            @keydown.enter.prevent="doSearch"
            hide-details
            single-line
          ></v-text-field>
      </v-app-bar>

      <!-- Search Results -->
      <v-sheet
          v-if="searchResults.length > 0"
          class="align-center justify-center text-center mx-auto mb-16"
      >
        <h6>
          <v-select
            class="d-inline-block"
            v-model="sortBy"
            :items="['relevance', 'date', 'rating', 'viewCount']"
            variant="underlined"
          ></v-select>
        </h6>
        <v-row>
          <v-col v-for="item in searchResults" :key="item.etag">
            <VideoCard
              :cardClass="['ma-4', 'video-item']"
              :item="item"
              :clickAction="() => getVideo(item.id.videoId)"
            ></VideoCard>
          </v-col>
        </v-row>
        <div>
          <v-btn
            @click="searchResults = []"
            class="text-none"
            variant="flat"
            width="90"
          >
            Close
          </v-btn>
        </div>
      </v-sheet>

      <h3 v-if="playlists.length > 0">Playlists</h3>
      <VideoSlider
        v-if="playlists.length > 0"
        v-model="selectedPlaylist"
        :items="playlists"
      ></VideoSlider>
      <v-expand-transition>
        <v-sheet
          v-if="selectedPlaylist != null"
        >
          <h4>{{ playlists[selectedPlaylist].snippet.title }}</h4>
          <VideoSlider
            v-if="videos.length > 0"
            v-model="selectedVideo"
            :items="videos"
          ></VideoSlider>
        </v-sheet>
      </v-expand-transition>

      <h3 v-if="likes.length > 0">Likes</h3>
      <VideoSlider
        v-if="likes.length > 0"
        v-model="selectedLL"
        :items="likes"
      ></VideoSlider>

      <v-dialog
        v-model="openVideo">
        <v-sheet
          class="align-center justify-center text-center mx-auto"
          elevation="4"
        >
          <div v-html="embedHtml"></div>
          <div>
            <v-btn
              @click="openVideo = false"
              class="text-none"
              variant="flat"
              width="90"
            >
              Close
            </v-btn>
          </div>
        </v-sheet>
      </v-dialog>
    </v-responsive>
  </v-container>
</template>
<script>
export default {
  data() {
    return {
      searchWords: '',
      googleReady: false,
      token: null,
      searchResults: [],
      playlists: [],
      selectedPlaylist: null,
      selectedVideo: null,
      videos: [],
      openVideo: false,
      embedHtml: '',
      likes: [],
      selectedLL: null,
      sortBy: 'relevance'
    }
  },
  mounted() {
    console.log('mounted')
    const loadMyPlaylists = () => {
      window.gapi.client.youtube.playlists.list({
        part: 'snippet',
        mine: true,
        maxResults: 100,
        access_token: this.token
      }).then((response) => {
        console.log(response.result)
        this.playlists = response.result.items
      })
    }
    const loadLikes = () => {
      window.gapi.client.youtube.videos.list({
        part: 'snippet',
        myRating: 'like',
        maxResults: 100,
        access_token: this.token
      }).then((response) => {
        console.log(response.result)
        this.likes = response.result.items
      })
    }
    const initGoogleClient = () => {
      window.gapi.client.init({
        'apiKey': import.meta.env.VITE_APIKEY,
        'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
        // clientId and scope are optional if auth is not required.
        // 'clientId': 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
        // 'scope': 'profile',
      }).then(() => {
        this.googleReady = true
        console.log('google ready')
        loadMyPlaylists()
        loadLikes()
      })
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      auto_select: true,
      client_id: import.meta.env.VITE_CLIENTID,
      scope: 'https://www.googleapis.com/auth/youtube',
      use_fedcm_for_prompt: false,
      callback: (res) => {
        console.log(res)
        if (res && res.access_token) {
          this.token = res.access_token
          console.log('token set')
          window.gapi.load('client', initGoogleClient)
        }
      }
    })
    client.requestAccessToken()
  },
  methods: {
    doSearch() {
      window.gapi.client.youtube.search.list({
        q: this.searchWords,
        part: 'snippet',
        maxResults: 80,
        type: 'video',
        order: this.sortBy,
      }).then((response) => {
        console.log(response.result)
        this.searchResults = response.result.items
      })
    },
    getPlaylistItems(playlistId) {
      return window.gapi.client.youtube.playlistItems.list({
        part: 'snippet',
        maxResults: 100,
        access_token: this.token,
        playlistId: playlistId
      }).then((response) => {
        console.log(response.result)
        return response.result.items
      })
    },
    getVideo(videoId) {
      window.gapi.client.youtube.videos.list({
        part: 'player',
        maxResults: 1,
        maxHeight: 500,
        access_token: this.token,
        id: videoId
      }).then((response) => {
        console.log(response.result)
        this.embedHtml = response.result.items[0].player.embedHtml
      })
      this.openVideo = true
    }
  },
  watch: {
    async selectedPlaylist(newValue, oldValue) {
      if (newValue == null) {
        this.videos = []
      }
      if (newValue != null && newValue != oldValue) {
        this.videos = await this.getPlaylistItems(this.playlists[newValue].id)
      }
    },
    selectedVideo(newValue, oldValue) {
      if (newValue == null) {
        this.openVideo = false
      }
      if (newValue != null && newValue != oldValue) {
        this.getVideo(this.videos[newValue].snippet.resourceId.videoId)
      }
    },
    selectedLL(newValue, oldValue) {
      if (newValue == null) {
        this.openVideo = false
      }
      if (newValue != null && newValue != oldValue) {
        this.getVideo(this.likes[newValue].id)
      }
    },
    sortBy(newValue, oldValue) {
      this.doSearch()
    },
  }
}
</script>
<style lang="scss">
  .video-item {
    width: 200px;
  }
</style>