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
          placeholder="Search words or URL..."
          append-inner-icon="mdi-magnify"
          @click:append-inner="doSearch"
          @keydown.enter.prevent="doSearch"
          hide-details
          single-line
          clearable
          @click:clear="searchWords = ''"
        ></v-text-field>
      </v-app-bar>

      <!-- Search Results -->
      <v-sheet
          v-if="searchResults.length > 0"
          class="align-center justify-center text-center mx-auto mb-16"
      >
        <v-row class="align-center ma-1">
          <v-col cols="auto">
            <h3 class="mr-4 mb-0">Search results {{ selectedChannelName ? 'in ' + selectedChannelName : '' }}</h3>
          </v-col>
          <v-col cols="auto">sorted by</v-col>
          <v-col cols="auto">
            <v-select
              class="d-inline-block"
              v-model="sortBy"
              :items="['relevance', 'date', 'rating', 'viewCount']"
              variant="underlined"
              style="min-width: 120px;"
            ></v-select>
          </v-col>
          <v-spacer></v-spacer>
          <v-col cols="auto" class="d-flex justify-end align-center">
          <v-btn
            @click="searchResults = []"
            class="text-none"
            variant="flat"
          >
            Close
          </v-btn>
          </v-col>
        </v-row>
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

      <div class="d-flex align-center mb-2">
        <h3 class="mr-4">Playlists</h3>
        <v-btn
          color="primary"
          variant="flat"
          @click="showCreatePlaylist = true"
          size="small"
        >
          New..
        </v-btn>
      </div>
      <v-dialog v-model="showCreatePlaylist" max-width="400">
        <v-card>
          <v-card-title>Create New Playlist</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newPlaylistName"
              label="Playlist Name"
              autofocus
              required
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              @click="showCreatePlaylist = false"
            >Cancel</v-btn>
            <v-btn
              color="primary"
              @click="createPlaylist"
              :disabled="!newPlaylistName"
            >Create</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
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
        v-model="openVideo"
        transition="dialog-bottom-transition"
        fullscreen
        class="ma-0"
      >
        <v-sheet
          v-if="playingVideo != null"
          class="fill-height align-center justify-center text-center mx-auto"
          elevation="4"
        >
          <div v-html="playingVideo.player.embedHtml"></div>
          <v-row class="no-gutters justify-center ma-0">
            <v-col cols="2">
              <v-select
                v-model="playlistsToAdd"
                :items="playlistOptions"
                label="Add to playlists..."
                no-data-text="No playlists found"
                chips
                multiple
                flat
                density="compact"
              ></v-select>
            </v-col>
            <v-col cols="2">
              <v-btn
                variant="flat"
                width="90"
                @click="subscribeToChannel"
              >
                Subscribe
              </v-btn>
            </v-col>
            <v-col cols="2">
              <v-btn
                @click="closeVideo()"
                class="d-inline-flex"
                variant="flat"
                width="90"
              >
                Close
              </v-btn>
            </v-col>
          </v-row>
        </v-sheet>
      </v-dialog>

      <div class="text-right">{{ appVersion }}</div>
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
      likes: [],
      selectedLL: null,
      sortBy: 'relevance',
      mychannels: [],
      channelId: null,
      appVersion: import.meta.env.VITE_APP_VERSION,
      playlistsToAdd: [],
      playingVideo: null,
      showCreatePlaylist: false,
      newPlaylistName: '',
    }
  },
  computed: {
    playlistOptions() {
      return this.playlists.map((item) => {
        return {
          title: item.snippet.title,
          value: item.id,
        }
      })
    },
    openVideo() {
      return this.playingVideo != null
    },
    selectedChannelName() {
      if (!this.channelId) {
        return null
      }
      return this.mychannels.find((ch) => ch.channelId === this.channelId)?.title || null
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
        part: 'snippet,contentDetails',
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
        }].concat(response.result.items.map((it) => this.myChannelItem(it)))
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
    myChannelItem(it) {
      return {
        etag: it.etag,
        avator: it.snippet.thumbnails.default.url,
        title: it.snippet.title + ' (' + it.contentDetails.newItemCount + ')',
        channelId: it.snippet.resourceId.channelId,
      }
    },
    doSearch() {
      const props = {
        part: 'snippet',
        maxResults: 80,
        type: 'video',
        order: this.sortBy,
        safeSearch: 'strict',
      }
      if (this.searchWords) {
        if (this.searchWords.startsWith('https://')) {
          const videoId = this.extractYouTubeId(this.searchWords)
          if (videoId) {
            this.getVideo(videoId)
          }
          return
        }
        props.q = this.searchWords
      }
      if (this.channelId) {
        props.channelId = this.channelId
      }
      if (this.channelId || this.searchWords) {
        TokenClient.withToken(() => {
          window.gapi.client.youtube.search.list(props)
            .then((response) => {
              console.log(response.result)
              this.searchResults = response.result.items
            })
        })
      }
    },
    getPlaylistItems(playlistId) {
      return window.gapi.client.youtube.playlistItems.list({
        part: 'snippet',
        maxResults: 100,
        access_token: TokenClient.token,
        playlistId: playlistId
      }).then((response) => {
        console.log(response.result)
        return response.result.items.sort((a, b) => a.snippet.publishedAt > b.snippet.publishedAt ? -1 : 1)
      })
    },
    getVideo(videoId) {
      TokenClient.withToken(() => {
        window.gapi.client.youtube.videos.list({
          part: 'id,player,snippet',
          maxResults: 1,
          maxWidth: window.innerWidth,
          maxHeight: window.innerHeight,
          access_token: TokenClient.token,
          id: videoId
        }).then((response) => {
          console.log(response.result)
          this.playingVideo = response.result.items[0]
          // TODO call logging
          this.writeVideoLog()
        })
      })
    },
    writeVideoLog() {
      // TODO implement logging
      fetch("/.netlify/functions/videoLog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: this.playingVideo.id,
          title: this.playingVideo.snippet.title,
        }),
      }).then((res) => {
        console.log(res)
      })
    },
    addToPlaylist(videoId, playlistId) {
      TokenClient.withToken(() => {
        window.gapi.client.youtube.playlistItems.list({
          part: 'id',
          maxResults: 100,
          access_token: TokenClient.token,
          playlistId: playlistId,
          videoId: videoId
        }).then((response) => {
          if (!response.result.items || response.result.items.length == 0) {
            window.gapi.client.youtube.playlistItems.insert({
              part: 'snippet',
              access_token: TokenClient.token,
              resource: {
                snippet: {
                  playlistId: playlistId,
                  resourceId: {
                    kind: 'youtube#video',
                    videoId: videoId
                  }
                }
              }
            }).then((response) => {
              console.log(response.result)
            })
          }
        })      
      })
    },
    delFromPlaylist(videoId, playlistId) {
      TokenClient.withToken(() => {
        window.gapi.client.youtube.playlistItems.list({
          part: 'id',
          maxResults: 100,
          access_token: TokenClient.token,
          playlistId: playlistId,
          videoId: videoId
        }).then((response) => {
          if (response.result.items) {
            response.result.items.forEach((item) => {
              window.gapi.client.youtube.playlistItems.delete({
                access_token: TokenClient.token,
                id: item.id
              }).then((response) => {
                console.log(response.result)
              })
            })
          }
        })
      })
    },
    createPlaylist() {
      if (!this.newPlaylistName) return
      TokenClient.withToken(() => {
        window.gapi.client.youtube.playlists.insert({
          part: 'snippet',
          access_token: TokenClient.token,
          resource: {
            snippet: {
              title: this.newPlaylistName,
            },
          }
        }).then((response) => {
          console.log(response.result)
          this.playlists.unshift(response.result)
          this.showCreatePlaylist = false
          this.newPlaylistName = ''
        })
      })
    },
    subscribeToChannel() {
      if (!this.playingVideo) return
      const channelId = this.playingVideo.snippet.channelId
      TokenClient.withToken(() => {
        window.gapi.client.youtube.subscriptions.insert({
          part: 'snippet,contentDetails',
          access_token: TokenClient.token,
          resource: {
            snippet: {
              resourceId: {
                kind: 'youtube#channel',
                channelId: channelId
              }
            }
          }
        }).then((response) => {
          console.log(response.result)
          this.mychannels.push(this.myChannelItem(response.result))
        })
      })
    },
    closeVideo() {
      this.playingVideo = null
      this.playlistsToAdd = []
      this.selectedVideo = null
      this.selectedLL = null
    },
    extractYouTubeId(url) {
      try {
        const parsed = new URL(url);

        // host check
        const host = parsed.hostname.toLowerCase();
        if (
          !host.includes("youtube.com") &&
          !host.includes("youtu.be")
        ) {
          return null; // not YouTube
        }

        // 1. Standard watch URL: ?v=VIDEO_ID
        if (parsed.searchParams.has("v")) {
          return parsed.searchParams.get("v");
        }

        // 2. Short youtu.be/VIDEO_ID
        if (host === "youtu.be") {
          return parsed.pathname.slice(1).split("/")[0];
        }

        // 3. /embed/VIDEO_ID
        if (parsed.pathname.startsWith("/embed/")) {
          return parsed.pathname.split("/")[2];
        }

        // 4. /shorts/VIDEO_ID
        if (parsed.pathname.startsWith("/shorts/")) {
          return parsed.pathname.split("/")[2];
        }

        // 5. /v/VIDEO_ID (old style)
        if (parsed.pathname.startsWith("/v/")) {
          return parsed.pathname.split("/")[2];
        }

        return null;
      } catch {
        return null; // invalid URL
      }
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
      if (newValue != null && newValue != oldValue) {
        this.getVideo(this.videos[newValue].snippet.resourceId.videoId)
      }
    },
    selectedLL(newValue, oldValue) {
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
    },
    playlistsToAdd(newValue, oldValue) {
      if (this.playingVideo) {
        newValue.filter(n => oldValue.indexOf(n) === -1).forEach(n => {
          this.addToPlaylist(this.playingVideo.id, n)
        })
        oldValue.filter(n => newValue.indexOf(n) === -1).forEach(n => {
          this.delFromPlaylist(this.playingVideo.id, n)
        })
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