<template>
  <div class="flex flex-col w-full">
    <div
      v-for="item in props.data"
      :key="item.id"
      class="music-row flex items-center rounded h-16 hover:bg-[var(--color-hover)] gap-4 group"
      :class="{ playing: item.id == curMusicId }"
      @dblclick="handlePlay(item)">
      <lmg
        v-if="props.showCover"
        :src="item.picUrl"
        :width="100"
        :height="100"
        class="w-12 h-12 rounded" />
      <div class="flex flex-col flex-grow justify-center px-2 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <span
            v-if="item.id == curMusicId"
            class="music-bars"
            :class="{ 'is-paused': playerStore.paused }"
            aria-hidden="true">
            <i class="music-bar"></i>
            <i class="music-bar"></i>
            <i class="music-bar"></i>
          </span>
          <div class="font-bold cursor-default truncate min-w-0">
            {{ item.name }}
          </div>
        </div>
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
        :class="{
          'no-liked': !liked(item.id),
          'heart-pop': isLikePopping(item.id),
        }"
        :title="liked(item.id) ? '取消喜欢' : '喜欢'"
        @click.stop="handleLikeMusic(item)"
        @animationend="handleLikePopEnd(item.id)" />
      <div class="flex w-12 text-base justify-end">
        {{ displayDuration(item.duration) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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

/**
 * 喜欢成功切换后的心跳反馈：只加一次性 class，靠 animationend 移除，
 * 不用 setTimeout，避免组件提前卸载后残留定时器。
 */
const likePoppingIds = ref<number[]>([])

const isLikePopping = (id: number) => likePoppingIds.value.includes(id)

const triggerLikePop = (id: number) => {
  likePoppingIds.value = [...likePoppingIds.value, id]
}

const handleLikePopEnd = (id: number) => {
  likePoppingIds.value = likePoppingIds.value.filter((item) => item !== id)
}

const handleLikeMusic = async (music: MusicBaseInfo) => {
  try {
    await likeStore.toggleLike(music.id)
    // 成功切换后再播放心跳反馈，失败时不庆祝
    triggerLikePop(music.id)
  } catch (error) {
    console.error('[HaloMusic] toggle like failed:', error)
    notify({ message: '操作失败，请稍后重试', type: 'error' })
  }
}
</script>

<style scoped>
.subscribe-icon {
  color: var(--color-primary);
  padding: 0.25rem;
  border-radius: 9999px;
}

/* 喜欢切换成功后的心跳反馈，animationend 后由脚本移除 class */
.heart-pop {
  animation: halo-heart-pop var(--motion-slow) var(--ease-spring) both;
}

.no-liked {
  visibility: hidden;
}

.group:hover .no-liked {
  visibility: visible;
}

/* 行 hover：只过渡背景色，不做位移，避免牵动布局 */
.music-row {
  transition: background-color var(--motion-fast) var(--ease-standard);
}

/* 当前播放行的 3 根动感音条 */
.music-bars {
  display: inline-flex;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 2px;
  height: 12px;
}

.music-bar {
  width: 3px;
  height: 12px;
  border-radius: 1px;
  background-color: currentColor;
  transform-origin: bottom;
  animation: halo-bar-bounce 0.9s var(--ease-in-out) infinite;
}

.music-bar:nth-child(2) {
  animation-delay: 0.2s;
}

.music-bar:nth-child(3) {
  animation-delay: 0.4s;
}

/* 暂停时音条静止，恢复播放后从当前相位继续摆动 */
.music-bars.is-paused .music-bar {
  animation-play-state: paused;
}
</style>
