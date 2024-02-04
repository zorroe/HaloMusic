<template>
  <div class="flex flex-col w-full">
    <div
      v-for="item in props.data"
      class="flex items-center rounded h-16 hover:bg-gray-100 hover:bg-opacity-60 gap-4 group"
      :class="{ playing: item.id == curMusicId }"
      @dblclick="playerStore.playOne(item.id + '')">
      <lmg
        :src="item.picUrl"
        :width="100"
        :height="100"
        class="w-12 h-12 rounded"
        v-if="props.showCover"></lmg>
      <div class="flex flex-col flex-grow justify-center px-2">
        <div class="font-bold cursor-default">{{ item.name }}</div>
        <div class="flex gap-1 text-sm">
          <span
            class="ea-link"
            v-for="singer in item.singers"
            @click="routeTo(`/artist/${singer.id}`)"
            >{{ singer.name }}</span
          >
        </div>
      </div>
      <div class="w-1/3 text-base cursor-pointer">
        <span
          class="hover:underline"
          @click="routeTo(`/album/${item.album?.id}`)"
          >{{ item.album?.name }}</span
        >
      </div>
      <icon-park
        :icon="Like"
        :theme="likeMusicIds.indexOf(item.id) == -1 ? 'outline' : 'filled'"
        :size="16"
        class="subscribe-icon btn-animation"
        :class="{ 'no-liked': likeMusicIds.indexOf(item.id) == -1 }"
        @click="handleLikeMusic(item)" />
      <div class="flex w-12 text-base">
        {{ item.duration }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { likeMusicApi } from '@/api/music'
import { MusicBaseInfo } from '@/types/musicRel'
import { saveLikeMusicIds, routeTo } from '@/utils/common'
import { Like } from '@icon-park/vue-next'
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'

const playerStore = usePlayerStore(pinia)

const curMusicId = computed(() => playerStore.current.currentSong?.id)

/* 歌单封面图组件 */
interface Props {
  data: MusicBaseInfo[]
  showCover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  showCover: true,
})

const likeMusicIds = ref(
  JSON.parse(localStorage.getItem('likeMusicIds') || '[]')
)

const handleLikeMusic = async (music: MusicBaseInfo) => {
  await likeMusicApi({
    id: music.id,
    like: likeMusicIds.value.indexOf(music.id) == -1 ? true : false,
  })
  await saveLikeMusicIds()
  likeMusicIds.value = JSON.parse(localStorage.getItem('likeMusicIds') || '[]')
}
</script>

<style lang="scss" scoped>
.subscribe-icon {
  color: rgb(51, 94, 234);
  @apply rounded-full p-1;
}

.no-liked {
  @apply invisible group-hover:visible;
}
</style>
