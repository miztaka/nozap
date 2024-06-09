<template>
  <v-container class="fill-height">
    <v-responsive
      class="align-centerfill-height mx-auto"
      max-width="100%"
    >
      <v-app-bar :elevation="2">
        <template v-slot:prepend>
          <v-app-bar-nav-icon id="myChannels">
          </v-app-bar-nav-icon>
          <!-- Channels-->
          <v-menu activator="#myChannels" location="bottom">
            <v-list>
              <v-list-item
                v-for="item in mychannels"
                :key="item.etag"
                :prepend-icon="item.icon"
                :prepend-avatar="item.avator"
                :title="item.title"
                :value="item.channelId"
                :active="channelId === item.channelId"
                @click="channelId = item.channelId"
              ></v-list-item>
            </v-list>
          </v-menu>
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
const TokenClient = {
  client: window.google.accounts.oauth2.initTokenClient({
      auto_select: true,
      client_id: import.meta.env.VITE_CLIENTID,
      scope: 'https://www.googleapis.com/auth/youtube',
      use_fedcm_for_prompt: false,
      callback: '',
    }),
  token: null,
  expires_at: null,
  withToken(onSuccess, onError) {
    if (this.token != null && this.expires_at > Date.now()) {
      return onSuccess()
    }
    this.client.callback = (res) => {
      if (res.error !== undefined) {
        return onError(res.error)
      }
      this.token = res.access_token
      this.expires_at = Date.now() + (res.expires_in - 120) * 1000
      console.log('token set')
      return onSuccess()
    }
    this.client.requestAccessToken()
  },
}
export default {
  data() {
    return {
      searchWords: '',
      googleReady: false,
      searchResults: [],
      playlists: [],
      selectedPlaylist: null,
      selectedVideo: null,
      videos: [],
      openVideo: false,
      embedHtml: '',
      likes: [],
      selectedLL: null,
      sortBy: 'relevance',
      mychannels: [],
      channelId: null,
    }
  },
  mounted() {
    const loadMyPlaylists = () => {
      window.gapi.client.youtube.playlists.list({
        part: 'snippet',
        mine: true,
        maxResults: 100,
        access_token: TokenClient.token
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
        access_token: TokenClient.token
      }).then((response) => {
        console.log(response.result)
        this.likes = response.result.items
      })
    }
    const loadMyChannels = () => {
      window.gapi.client.youtube.subscriptions.list({
        part: 'snippet',
        mine: true,
        maxResults: 100,
        order: 'unread',
        access_token: TokenClient.token
      }).then((response) => {
        console.log(response.result)
        this.mychannels = [{
          etag: 'all',
          icon: "mdi-menu",
          title: 'すべてのチャンネル',
          channelId: null,
        }].concat(response.result.items.map((it) => ({
          etag: it.etag,
          avator: it.snippet.thumbnails.default.url,
          title: it.snippet.title,
          channelId: it.snippet.resourceId.channelId,
        })))
      })
    }
    const initGoogleClient = () => {
      window.gapi.client.init({
        'apiKey': import.meta.env.VITE_APIKEY,
        'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
      }).then(() => {
        this.googleReady = true
        console.log('google ready')
        loadMyPlaylists()
        loadLikes()
        loadMyChannels()
      })
    }
    TokenClient.withToken(() => {
      window.gapi.load('client', initGoogleClient)
    })
  },
  methods: {
    doSearch() {
      const props = {
        part: 'snippet',
        maxResults: 80,
        type: 'video',
        order: this.sortBy,
      }
      if (this.channelId) {
        props.channelId = this.channelId
      }
      if (this.searchWords) {
        props.q = this.searchWords
      }
      TokenClient.withToken(() => {
        window.gapi.client.youtube.search.list(props)
          .then((response) => {
            console.log(response.result)
            this.searchResults = response.result.items
          })
      })
    },
    getPlaylistItems(playlistId) {
      return window.gapi.client.youtube.playlistItems.list({
        part: 'snippet',
        maxResults: 100,
        access_token: TokenClient.token,
        playlistId: playlistId
      }).then((response) => {
        console.log(response.result)
        return response.result.items
      })
    },
    getVideo(videoId) {
      TokenClient.withToken(() => {
        window.gapi.client.youtube.videos.list({
          part: 'player',
          maxResults: 1,
          maxHeight: 700,
          access_token: TokenClient.token,
          id: videoId
        }).then((response) => {
          console.log(response.result)
          this.embedHtml = response.result.items[0].player.embedHtml
        })
        this.openVideo = true
      })
    }
  },
  watch: {
    async selectedPlaylist(newValue, oldValue) {
      if (newValue == null) {
        this.videos = []
      }
      if (newValue != null && newValue != oldValue) {
        TokenClient.withToken(async () => {
          this.videos = await this.getPlaylistItems(this.playlists[newValue].id)
        })
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
    channelId(newValue, oldValue) {
      if (newValue !== null) {
        if (oldValue === null && this.sortBy !== 'date') {
          this.sortBy = 'date'
        } else {
          this.doSearch()
        }
      }
    }
  }
}
</script>
<style lang="scss">
  .video-item {
    width: 200px;
  }
</style>