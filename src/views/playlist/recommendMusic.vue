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
import { onMounted, ref } from 'vue'
import { getRecommendSongsApi } from '@/api/music'
import type { MusicBaseInfo } from '@/types/musicRel'
import notify from '@/components/common/notification/notify'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'recommendMusic',
})

/* 每日推荐歌曲页面 */
const recommendSongList = ref<MusicBaseInfo[]>([])
const loaded = ref(false)
const loadFailed = ref(false)

const getRecommendSongs = async () => {
  loaded.value = false
  loadFailed.value = false
  try {
    const { data } = await getRecommendSongsApi()
    recommendSongList.value = (data?.dailySongs ?? []).map(mapSong)
    loaded.value = true
  } catch (error) {
    console.error('[HaloMusic] load recommend songs failed:', error)
    loadFailed.value = true
    notify({ message: '每日推荐加载失败，请稍后重试', type: 'error' })
  }
}

onMounted(getRecommendSongs)
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
