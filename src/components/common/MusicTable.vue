<template>
  <div class="flex flex-col w-full">
    <div
      v-for="item in props.data"
      :key="item.id"
      class="music-row flex items-center rounded h-16 hover:bg-gray-100/60 gap-4 group"
      :class="{ playing: item.id == curMusicId }"
      @dblclick="handlePlay(item)">
      <lmg
        v-if="props.showCover"
        :src="item.picUrl"
        :width="100"
        :height="100"
        class="w-12 h-12 rounded" />
      <div class="flex flex-col flex-grow justify-center px-2 min-w-0">
        <div class="font-bold cursor-default truncate">{{ item.name }}</div>
        <div class="flex gap-1 text-sm">
          <span
            v-for="singer in item.singers"
            :key="singer.id"
            class="ea-link"
            @click.stop="routeTo(`/artist/${singer.id}`)"
            >{{ singer.name }}</span
          >
        </div>
      </div>
      <div class="w-1/3 text-base cursor-pointer truncate">
        <span
          class="hover:underline"
          @click.stop="routeTo(`/album/${item.album?.id}`)"
          >{{ item.album?.name }}</span
        >
      </div>
      <icon-park
        :icon="Like"
        :theme="liked(item.id) ? 'filled' : 'outline'"
        :size="16"
        class="subscribe-icon btn-animation"
        :class="{ 'no-liked': !liked(item.id) }"
        :title="liked(item.id) ? '取消喜欢' : '喜欢'"
        @click.stop="handleLikeMusic(item)" />
      <div class="flex w-12 text-base justify-end">
        {{ displayDuration(item.duration) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Like } from '@icon-park/vue-next'
import type { MusicBaseInfo } from '@/types/musicRel'
import { routeTo, formatTrackTime } from '@/utils/common'
import { usePlayerStore } from '@/store/playerStore'
import { useLikeStore } from '@/store/index'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'

defineOptions({
  name: 'musicTable',
})

interface Props {
  data?: MusicBaseInfo[]
  showCover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  showCover: true,
})

const playerStore = usePlayerStore(pinia)
const likeStore = useLikeStore(pinia)

const curMusicId = computed(() => playerStore.current.currentSong?.id)

const liked = (id: number) => likeStore.isLiked(id)

/**
 * duration 在历史数据里既可能是 "4:03" 字符串，也可能是原始毫秒数，
 * 这里统一收敛：数字按毫秒格式化，字符串原样展示。
 */
const displayDuration = (duration: MusicBaseInfo['duration'] | number) => {
  if (typeof duration === 'number') {
    return duration > 999
      ? formatTrackTime(Math.round(duration / 1000))
      : formatTrackTime(duration)
  }
  return duration ?? ''
}

const handlePlay = (music: MusicBaseInfo) => {
  playerStore.playOne(music.id + '')
}

const handleLikeMusic = async (music: MusicBaseInfo) => {
  try {
    await likeStore.toggleLike(music.id)
  } catch (error) {
    console.error('[HaloMusic] toggle like failed:', error)
    notify({ message: '操作失败，请稍后重试', type: 'error' })
  }
}
</script>

<style scoped>
.subscribe-icon {
  color: rgb(51, 94, 234);
  padding: 0.25rem;
  border-radius: 9999px;
}

.no-liked {
  visibility: hidden;
}

.group:hover .no-liked {
  visibility: visible;
}
</style>
