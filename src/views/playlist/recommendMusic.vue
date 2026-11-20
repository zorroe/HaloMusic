<template>
  <!-- 加载骨架：保留页面大标题的版式留白 + 与歌单行高一致的列表 -->
  <div
    v-if="!loaded && !loadFailed"
    class="flex flex-col"
    aria-busy="true">
    <div class="special-playlist">
      <div class="flex justify-center">
        <ea-skeleton
          variant="rect"
          width="min(90%, 32rem)"
          height="88px"
          radius="12px" />
      </div>
      <div class="flex justify-center">
        <ea-skeleton
          variant="text"
          width="18rem"
          class="mt-7 mb-[54px]" />
      </div>
    </div>
    <div class="flex flex-col">
      <ea-skeleton
        v-for="index in 10"
        :key="`skeleton-recommend-${index}`"
        variant="row" />
    </div>
  </div>
  <ea-empty
    v-else-if="loadFailed"
    title="每日推荐加载失败"
    description="请检查网络后重试"
    action-text="重新加载"
    @action="getRecommendSongs" />
  <template v-else>
    <div class="special-playlist">
      <div class="title gradient">每日歌曲推荐</div>
      <div class="subtitle">根据你的音乐口味生成 · 每天6:00更新</div>
    </div>
    <music-table
      v-if="recommendSongList.length"
      :data="recommendSongList"></music-table>
    <ea-empty
      v-else
      title="今天还没有推荐歌曲"
      description="稍后再来看看吧" />
  </template>
</template>

<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { getRecommendSongsApi } from '@/api/music'
import type { MusicBaseInfo } from '@/types/musicRel'
import { handleRequestError } from '@/utils/common'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'recommendMusic',
})

/** keep-alive 静默刷新阈值：距上次加载超过 5 分钟才在重新激活时后台重拉 */
const SILENT_REFRESH_INTERVAL_MS = 5 * 60 * 1000

/* 每日推荐歌曲页面 */
const recommendSongList = ref<MusicBaseInfo[]>([])
const loaded = ref(false)
const loadFailed = ref(false)

/** keep-alive 静默刷新状态：上次加载时间 / 上次是否失败 / 是否正在静默刷新 */
let lastLoadedAt = 0
let lastLoadFailed = false
let silentRefreshing = false

/**
 * 拉取每日推荐。
 * silent=true 用于 keep-alive 重新激活：不显示骨架、失败不提示、保留现有内容。
 */
const getRecommendSongs = async (silent = false) => {
  if (silent) {
    if (silentRefreshing) return
    silentRefreshing = true
  } else {
    loaded.value = false
    loadFailed.value = false
  }
  try {
    const { data } = await getRecommendSongsApi()
    recommendSongList.value = (data?.dailySongs ?? []).map(mapSong)
    loaded.value = true
    loadFailed.value = false
    lastLoadFailed = false
  } catch (error) {
    console.error('[HaloMusic] load recommend songs failed:', error)
    lastLoadFailed = true
    if (silent) return
    loadFailed.value = true
    handleRequestError(error, '每日推荐加载失败，请稍后重试')
  } finally {
    lastLoadedAt = Date.now()
    silentRefreshing = false
  }
}

onMounted(() => {
  void getRecommendSongs()
})

onActivated(() => {
  // 首次激活与 onMounted 的首次加载会先后触发：lastLoadedAt 为 0 时说明首屏还没落地，直接跳过
  if (!lastLoadedAt || silentRefreshing) return
  if (!lastLoadFailed && Date.now() - lastLoadedAt < SILENT_REFRESH_INTERVAL_MS) {
    return
  }
  void getRecommendSongs(true)
})
</script>

<style scoped>
.special-playlist {
  margin-top: 192px;
  margin-bottom: 128px;
  border-radius: 1.25em;
  text-align: center;
}

@keyframes letterSpacing4 {
  from {
    letter-spacing: 0px;
  }

  to {
    letter-spacing: 4px;
  }
}

@keyframes letterSpacing1 {
  from {
    letter-spacing: 0px;
  }

  to {
    letter-spacing: 1px;
  }
}

.special-playlist .title {
  font-size: 84px;
  line-height: 1.05;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 4px;
  animation-duration: 0.8s;
  animation-name: letterSpacing4;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.special-playlist .subtitle {
  font-size: 18px;
  letter-spacing: 1px;
  margin: 28px 0 54px 0;
  animation-duration: 0.8s;
  animation-name: letterSpacing1;
  text-transform: uppercase;
  color: var(--color-text);
}

.gradient {
  background: linear-gradient(to left, #dd2476, #ff512f);
}
</style>
