<template>
  <div style="margin-top: 10px">
    <van-row justify="center" v-if="!wyAccount" style="margin-top: 120px">
      <van-col span="20">
        <van-empty description="请先绑定网易云账号">
          <van-button round type="primary" size="small" @click="$router.push('/account')">
            去绑定账号
          </van-button>
        </van-empty>
      </van-col>
    </van-row>

    <van-row v-else>
      <van-col span="24">
        <van-row v-if="isLoading">
          <van-col span="24" style="margin-top: 60px">
            <van-loading type="spinner" />
          </van-col>
        </van-row>

        <van-row v-else-if="songs.length === 0 && loadedOnce">
          <van-col span="24" style="margin-top: 60px">
            <van-empty description="云盘里还没有歌曲" />
          </van-col>
        </van-row>

        <van-row v-else>
          <van-col span="24">
            <van-row
              v-for="(song, i) in songs"
              :key="i"
              style="
                padding: 10px 12px;
                border-bottom: 1px solid #f2f2f2;
                text-align: left;
              "
            >
              <van-col span="5">
                <img
                  :src="song.cover"
                  onerror="this.src='https://cdnmusic.migu.cn/v3/static/img/common/default/img_default_240x240.jpg'"
                  style="width: 48px; height: 48px; border-radius: 4px"
                />
              </van-col>
              <van-col span="14" style="padding-top: 4px">
                <van-row style="font-size: 14px">
                  {{ ellipsis(song.songName, 16) }}
                </van-row>
                <van-row style="font-size: 11px; color: gray; margin-top: 4px">
                  {{ song.artists.join(" / ") }}
                </van-row>
              </van-col>
              <van-col span="5" style="line-height: 48px; text-align: right">
                <van-icon
                  name="play-circle-o"
                  size="22"
                  color="#1989fa"
                  @click="playTheSong(song)"
                />
                <van-icon
                  name="delete-o"
                  size="22"
                  color="#ee0a24"
                  style="margin-left: 12px"
                  @click="deleteTheSong(song)"
                />
              </van-col>
            </van-row>
          </van-col>

          <van-col span="24" style="margin-top: 15px; margin-bottom: 20px">
            <van-button
              v-if="hasMore"
              block
              type="primary"
              plain
              round
              size="small"
              :loading="isLoadingMore"
              @click="loadMore"
            >
              加载更多
            </van-button>
          </van-col>
        </van-row>
      </van-col>
    </van-row>
  </div>
</template>

<script>
import { getCloudSongs, deleteCloudSong, getPlayUrl } from "../../api";
import storage from "../../utils/storage";
import { ellipsis } from "../../utils";
import { Notify, Dialog } from "vant";

export default {
  data() {
    return {
      wyAccount: null,
      songs: [],
      total: 0,
      pageSize: 30,
      isLoading: false,
      isLoadingMore: false,
      loadedOnce: false,
    };
  },
  props: {
    playTheSongWithPlayUrl: {
      type: Function,
      required: true,
    },
  },
  setup(props, { emit }) {
    const playTheSongWithPlayUrl = (playOption) => {
      props.playTheSongWithPlayUrl(playOption);
    };
    return {
      playTheSongWithPlayUrl,
      ellipsis,
    };
  },
  computed: {
    hasMore() {
      return this.songs.length < this.total;
    },
  },
  async mounted() {
    this.wyAccount = storage.get("wyAccount");
    if (this.wyAccount) {
      this.loadCloudSongs();
    }
  },
  watch: {
    $route(to, from) {
      this.wyAccount = storage.get("wyAccount");
      if (to.path === "/cloud" && this.wyAccount) {
        this.loadCloudSongs();
      }
    },
  },
  methods: {
    async loadCloudSongs() {
      this.isLoading = true;
      try {
        const ret = await getCloudSongs({
          offset: 0,
          limit: this.pageSize,
        });
        if (ret.status === 0) {
          this.songs = ret.data.songs;
          this.total = ret.data.count || 0;
        } else {
          Notify({ type: "warning", message: "获取云盘列表失败" });
        }
      } finally {
        this.isLoading = false;
        this.loadedOnce = true;
      }
    },
    async loadMore() {
      this.isLoadingMore = true;
      try {
        const ret = await getCloudSongs({
          offset: this.songs.length,
          limit: this.pageSize,
        });
        if (ret.status === 0) {
          this.songs = this.songs.concat(ret.data.songs);
          this.total = ret.data.count || 0;
        }
      } finally {
        this.isLoadingMore = false;
      }
    },
    async playTheSong(song) {
      const ret = await getPlayUrl(song.songId);
      this.playTheSongWithPlayUrl({
        songId: song.songId,
        playUrl: ret.data.playUrl,
        source: "netease",
        coverUrl: song.cover,
        songName: song.songName,
        pageUrl: `https://music.163.com/#/song?id=${song.songId}`,
        artist: song.artists[0] || "",
      });
    },
    deleteTheSong(song) {
      Dialog.confirm({
        title: "提示",
        message: `确定要从网易云云盘删除《${song.songName}》吗？`,
      }).then(async () => {
        const ret = await deleteCloudSong(song.songId);
        if (ret.status === 0) {
          Notify({ type: "success", message: "删除成功" });
          this.loadCloudSongs();
        } else {
          Notify({ type: "warning", message: "删除失败" });
        }
      });
    },
  },
};
</script>