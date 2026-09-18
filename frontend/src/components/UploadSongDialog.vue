<template>
  <el-dialog
    :model-value="visible"
    title="上传到网易云云盘"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="onVisibleChange"
  >
    <el-form :model="form" label-width="70px" label-position="left">
      <el-form-item label="匹配官方">
        <div class="match-official-row">
          <el-switch v-model="form.matchOfficial" />
          <span class="match-official-tip">
            开启后按标题/作者搜索网易云官方歌曲并匹配，可获取歌词与官方封面
          </span>
        </div>
      </el-form-item>

      <el-form-item v-if="!form.matchOfficial" label="歌曲封面">
        <div class="cover-upload-row">
          <el-image
            class="cover-preview"
            :src="form.coverUrl"
            fit="cover"
            :preview-src-list="form.coverUrl ? [form.coverUrl] : []"
          >
            <template #error>
              <div class="cover-error">
                <i class="bi bi-music-note"></i>
              </div>
            </template>
          </el-image>
          <el-input
            v-model="form.coverUrl"
            placeholder="封面图片链接（可留空）"
            clearable
            class="cover-input"
          />
        </div>
      </el-form-item>

      <el-form-item label="标题" required>
        <el-input v-model="form.songName" placeholder="歌曲标题" clearable />
      </el-form-item>

      <el-form-item label="作者" required>
        <el-input v-model="form.artist" placeholder="歌手 / 作者" clearable />
      </el-form-item>

      <el-form-item label="专辑">
        <el-input v-model="form.album" placeholder="专辑名称（可留空）" clearable />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="onVisibleChange(false)">取消</el-button>
        <el-button type="primary" :loading="isUploading" @click="onConfirm">
          确认上传
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.match-official-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.match-official-tip {
  font-size: 12px;
  color: #909399;
}

.cover-upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.cover-preview {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid #ebeef5;
}

.cover-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 22px;
  background: #f5f7fa;
}

.cover-input {
  flex: 1;
}
</style>

<script>
import { createSyncSongFromUrlJob } from "../api";
import { startTaskListener } from "./TaskNotification";
import { ElMessage } from "element-plus";

export default {
  name: "UploadSongDialog",
  data() {
    return {
      form: {
        songName: "",
        artist: "",
        album: "",
        coverUrl: "",
        matchOfficial: true,
      },
      isUploading: false,
    };
  },
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
    songUrl: {
      type: String,
      required: true,
    },
    suggestMatchSongId: {
      type: String,
      required: false,
      default: "",
    },
    defaultMeta: {
      type: Object,
      required: false,
      default: () => ({}),
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.form = {
          songName: this.defaultMeta.songName || "",
          artist: this.defaultMeta.artist || "",
          album: this.defaultMeta.album || "",
          coverUrl: this.defaultMeta.coverUrl || this.defaultMeta.cover || "",
          matchOfficial: true,
        };
      }
    },
  },
  methods: {
    onVisibleChange(val) {
      this.$emit("update:visible", val);
    },
    async onConfirm() {
      if (!this.form.songName.trim()) {
        ElMessage.warning("请输入歌曲标题");
        return;
      }
      if (!this.form.artist.trim()) {
        ElMessage.warning("请输入作者");
        return;
      }

      this.isUploading = true;
      try {
        const ret = await createSyncSongFromUrlJob(
          this.songUrl,
          this.suggestMatchSongId,
          {
            songName: this.form.songName.trim(),
            artist: this.form.artist.trim(),
            album: this.form.album.trim(),
            coverUrl: this.form.coverUrl.trim(),
            matchOfficial: this.form.matchOfficial,
          }
        );
        if (ret.data && ret.data.jobId) {
          this.onVisibleChange(false);
          startTaskListener(ret.data.jobId);
        }
      } finally {
        this.isUploading = false;
      }
    },
  },
};
</script>