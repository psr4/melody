<template>
  <el-container style="margin-top: 20px">
    <el-main style="padding: 0">
      <el-row justify="center">
        <el-col :span="20">
          <el-row v-if="!wyAccount" justify="center" style="margin-top: 100px">
            <el-col :span="12">
              <el-empty description="请先绑定网易云账号">
                <el-button type="primary" @click="$router.push('/account')">
                  去绑定账号
                </el-button>
              </el-empty>
            </el-col>
          </el-row>

          <el-row v-else>
            <el-col :span="24">
              <div class="cloud-header">
                <i class="bi bi-cloud" style="font-size: 22px"></i>
                <span style="font-size: 18px; font-weight: 600">
                  我的网易云云盘
                </span>
                <span class="cloud-count" v-if="total > 0">
                  共 {{ total }} 首
                </span>
              </div>

              <el-table
                :data="songs"
                :stripe="true"
                class="cloud-table"
                v-loading="isLoading"
                :header-cell-style="{
                  background: '#f5f7fa',
                  color: '#606266',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  height: '50px',
                }"
                :row-style="{ height: '60px' }"
              >
                <el-table-column type="index" width="60" align="center" />

                <el-table-column label="封面" width="80" align="center">
                  <template #default="scope">
                    <el-image
                      class="cover-image"
                      :src="scope.row.cover"
                      fit="cover"
                      :preview-src-list="scope.row.cover ? [scope.row.cover] : []"
                    >
                      <template #error>
                        <div class="cover-placeholder">
                          <i class="bi bi-music-note-beamed"></i>
                        </div>
                      </template>
                    </el-image>
                  </template>
                </el-table-column>

                <el-table-column
                  label="歌曲"
                  min-width="250"
                  prop="songName"
                  align="center"
                />

                <el-table-column
                  label="歌手"
                  min-width="120"
                  align="center"
                >
                  <template #default="scope">
                    {{ scope.row.artists.join(" / ") }}
                  </template>
                </el-table-column>

                <el-table-column
                  label="专辑"
                  min-width="180"
                  align="center"
                >
                  <template #default="scope">
                    {{ scope.row.album || " - " }}
                  </template>
                </el-table-column>

                <el-table-column label="大小" width="100" align="center">
                  <template #default="scope">
                    {{ formatFileSize(scope.row.fileSize) }}
                  </template>
                </el-table-column>

                <el-table-column label="添加时间" width="120" align="center">
                  <template #default="scope">
                    {{ formatTime(scope.row.addTime) }}
                  </template>
                </el-table-column>

                <el-table-column label="操作" width="140" align="center">
                  <template #default="scope">
                    <el-tooltip content="播放歌曲" placement="top">
                      <el-button
                        type="primary"
                        circle
                        class="operation-btn"
                        @click="playTheSong(scope.row)"
                      >
                        <i class="bi bi-play-circle"></i>
                      </el-button>
                    </el-tooltip>

                    <el-tooltip content="从云盘删除" placement="top">
                      <el-button
                        type="danger"
                        circle
                        class="operation-btn"
                        @click="deleteTheSong(scope.row)"
                      >
                        <i class="bi bi-trash"></i>
                      </el-button>
                    </el-tooltip>
                  </template>
                </el-table-column>
              </el-table>

              <el-pagination
                class="cloud-pagination"
                background
                layout="prev, pager, next, total"
                :total="total"
                :page-size="pageSize"
                :current-page="currentPage"
                @current-change="onPageChange"
              />
            </el-col>
          </el-row>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<style scoped>
.cloud-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.cloud-count {
  font-size: 13px;
  color: #909399;
}

.cloud-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.cover-image {
  width: 40px;
  height: 40px;
  border-radius: 4px;
}

.cover-placeholder {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #c0c4cc;
  font-size: 18px;
  background: #f5f7fa;
}

.operation-btn {
  padding: 6px;
  font-size: 16px;
}

.cloud-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}
</style>

<script>
import { getCloudSongs, deleteCloudSong, getPlayUrl } from "../../api";
import storage from "../../utils/storage";
import { ElMessage, ElMessageBox } from "element-plus";

export default {
  data() {
    return {
      wyAccount: null,
      songs: [],
      total: 0,
      currentPage: 1,
      pageSize: 30,
      isLoading: false,
    };
  },
  props: {
    playTheSongWithPlayUrl: {
      type: Function,
      required: true,
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
  setup(props, { emit }) {
    const playTheSongWithPlayUrl = (playOption) => {
      props.playTheSongWithPlayUrl(playOption);
    };
    return {
      playTheSongWithPlayUrl,
    };
  },
  methods: {
    async loadCloudSongs() {
      this.isLoading = true;
      try {
        const ret = await getCloudSongs({
          offset: (this.currentPage - 1) * this.pageSize,
          limit: this.pageSize,
        });
        if (ret.status === 0) {
          this.songs = ret.data.songs;
          this.total = ret.data.count || 0;
        } else {
          ElMessage.error("获取云盘列表失败");
        }
      } finally {
        this.isLoading = false;
      }
    },
    onPageChange(page) {
      this.currentPage = page;
      this.loadCloudSongs();
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
    async deleteTheSong(song) {
      ElMessageBox.confirm(
        `确定要从网易云云盘删除《${song.songName}》吗？`,
        "Warning",
        {
          confirmButtonText: "删除",
          cancelButtonText: "取消",
          type: "warning",
        }
      ).then(async () => {
        const ret = await deleteCloudSong(song.songId);
        if (ret.status === 0) {
          ElMessage.success("删除成功");
          this.loadCloudSongs();
        } else {
          ElMessage.error("删除失败");
        }
      });
    },
    formatFileSize(size) {
      if (!size) {
        return " - ";
      }
      const mb = size / 1024 / 1024;
      return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(size / 1024).toFixed(1)} KB`;
    },
    formatTime(timestamp) {
      if (!timestamp) {
        return " - ";
      }
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    },
  },
};
</script>