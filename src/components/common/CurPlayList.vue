<template>
  <div v-if="currentMusic">
    <div class="text-lv1">正在播放</div>
    <div>
      <music-table :data="currentMusic"></music-table>
    </div>
    <div class="text-lv1">即将播放</div>
    <div>
      <music-table :data="showPlayList"></music-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayer2Store } from '@/store/playerStore'
import pinia from '@/store/store'
import { computed } from 'vue'

defineOptions({
  name: 'curPlaylist',
})

const player2Store = usePlayer2Store(pinia)
const song = computed(() => player2Store.current.currentSong)
const currentMusic = computed(() => [player2Store.current.currentSong])
const currentPlaylist = computed(() => player2Store.playlist)

const showPlayList = computed(() => {
  const ids = currentPlaylist.value.findIndex(
    (item: any) => item.id === song.value.id
  )
  return currentPlaylist.value
    .slice(ids + 1)
    .concat(currentPlaylist.value.slice(0, ids))
})
</script>

<style scoped></style>
